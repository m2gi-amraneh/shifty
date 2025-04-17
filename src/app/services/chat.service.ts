import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  addDoc,
  collectionData,
  query,
  orderBy,
  Timestamp,
  where,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  arrayUnion,
  getDoc,
  writeBatch,
  limit
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject } from 'rxjs';

export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Timestamp;
  chatRoomId: string;
}

export interface ChatRoom {
  id?: string;
  name: string;
  participants: string[];
  createdBy: string;
  createdAt: Timestamp;
  isPrivate: boolean;
}
// New interface for Access Requests
export interface AccessRequest {
  id?: string;
  roomId: string;
  roomName: string; // Denormalized for easier display
  requestingUserId: string;
  requestingUserName: string; // Denormalized
  requestingUserProfilePic?: string; // Optional
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: Timestamp;
  creatorId: string; // ID of the room creator to query requests by creator
}
@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private chatRoomsSubject = new BehaviorSubject<ChatRoom[]>([]);
  chatRooms$ = this.chatRoomsSubject.asObservable();

  constructor(private firestore: Firestore) {
    // Optionally start listening immediately if desired
    // this.listenToAllChatRooms();
  }

  // --- Chat Room Operations ---

  // Listener for all chat rooms (modified to use onSnapshot)
  listenToAllChatRooms(): () => void { // Return unsubscribe function
    const chatRoomCollection = collection(this.firestore, 'chatRooms');
    const q = query(chatRoomCollection, orderBy('createdAt', 'desc')); // Order by creation time

    // onSnapshot returns an unsubscribe function
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatRooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatRoom));
      console.log("Chat Rooms Updated via Snapshot:", chatRooms.length);
      this.chatRoomsSubject.next(chatRooms);
    }, (error) => {
      console.error("Error listening to chat rooms:", error);
      // Handle error appropriately, maybe set rooms to [] or show a message
      this.chatRoomsSubject.next([]);
    });

    return unsubscribe; // Return the function to allow cleanup
  }

  // Get all chat rooms (if you need a one-time fetch, though listener is usually better)
  // async getAllChatRoomsOnce(): Promise<ChatRoom[]> {
  //    const chatRoomCollection = collection(this.firestore, 'chatRooms');
  //    const q = query(chatRoomCollection, orderBy('createdAt', 'desc'));
  //    const snapshot = await getDocs(q);
  //    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatRoom));
  // }


  // Create a new chat room (no changes needed here, logic is in component)
  async createChatRoom(
    roomName: string,
    participants: string[], // Will be empty for public rooms
    createdBy: string,
    isPrivate: boolean = true
  ): Promise<any> {
    const chatRoomCollection = collection(this.firestore, 'chatRooms');
    return addDoc(chatRoomCollection, {
      name: roomName,
      participants: participants, // Store empty array for public
      createdBy: createdBy,
      createdAt: Timestamp.now(),
      isPrivate: isPrivate,
      lastMessageTimestamp: null // Optional: Track last message time for sorting
    });
  }

  // Get a single chat room (useful for checking details)
  async getChatRoom(chatRoomId: string): Promise<ChatRoom | null> {
    const chatRoomRef = doc(this.firestore, 'chatRooms', chatRoomId);
    const chatRoomSnap = await getDoc(chatRoomRef);
    if (chatRoomSnap.exists()) {
      return { id: chatRoomSnap.id, ...chatRoomSnap.data() } as ChatRoom;
    } else {
      return null;
    }
  }


  // Delete a chat room (only by creator - add check)
  async deleteChatRoom(chatRoomId: string, userId: string): Promise<void> {
    const chatRoomRef = doc(this.firestore, 'chatRooms', chatRoomId);
    const roomSnap = await getDoc(chatRoomRef);

    if (!roomSnap.exists()) {
      throw new Error('Chat room not found');
    }
    const roomData = roomSnap.data() as ChatRoom;
    if (roomData.createdBy !== userId) {
      throw new Error('Only the creator can delete this room');
    }

    // Optional: Delete associated messages and access requests in a batch
    const batch = writeBatch(this.firestore);
    batch.delete(chatRoomRef); // Delete the room itself

    // Consider deleting messages (can be slow/costly for many messages)
    const messagesQuery = query(collection(this.firestore, 'messages'), where('chatRoomId', '==', chatRoomId));
    const messagesSnapshot = await getDocs(messagesQuery);
    messagesSnapshot.forEach(msgDoc => batch.delete(msgDoc.ref));

    // Delete pending access requests for this room
    const requestsQuery = query(collection(this.firestore, 'accessRequests'), where('roomId', '==', chatRoomId));
    const requestsSnapshot = await getDocs(requestsQuery);
    requestsSnapshot.forEach(reqDoc => batch.delete(reqDoc.ref));


    return batch.commit();
    // Simple delete without batch:
    // return deleteDoc(chatRoomRef);
  }

  // Check if user is allowed to access a chat room
  // This logic remains correct: public rooms are always accessible,
  // private rooms require the user ID in the participants list.
  async canAccessChatRoom(chatRoomId: string, userId: string): Promise<boolean> {
    const chatRoom = await this.getChatRoom(chatRoomId);

    if (!chatRoom) return false; // Room doesn't exist

    // Public rooms are accessible to everyone
    if (!chatRoom.isPrivate) {
      return true;
    }

    // Private rooms require the user to be in the participants list
    return chatRoom.participants.includes(userId);
  }


  // --- Message Operations ---

  // Get messages (no changes needed)
  getChatRoomMessages(chatRoomId: string): Observable<ChatMessage[]> {
    const messagesCollection = collection(this.firestore, 'messages');
    const messageQuery = query(
      messagesCollection,
      where('chatRoomId', '==', chatRoomId),
      orderBy('timestamp', 'asc')
    );

    return collectionData(messageQuery, { idField: 'id' }) as Observable<ChatMessage[]>;
  }

  // Send message (no changes needed)
  sendMessage(message: Omit<ChatMessage, 'id'>): Promise<any> {
    const messagesCollection = collection(this.firestore, 'messages');
    return addDoc(messagesCollection, message);
  }


  // --- Access Request Operations ---

  private accessRequestsCollection = collection(this.firestore, 'accessRequests');

  // Create a request to join a private room
  async requestAccess(
    roomId: string,
    roomName: string,
    requestingUserId: string,
    requestingUserName: string,
    creatorId: string,
    requestingUserProfilePic?: string // Optional
  ): Promise<void> {

    // 1. Check if the user is already a participant
    const room = await this.getChatRoom(roomId);
    if (room && room.participants.includes(requestingUserId)) {
      throw new Error("You are already a participant in this room.");
    }
    if (room && !room.isPrivate) {
      throw new Error("This room is public, no request needed."); // Should ideally not happen
    }

    // 2. Check if a pending request already exists for this user and room
    const q = query(
      this.accessRequestsCollection,
      where('roomId', '==', roomId),
      where('requestingUserId', '==', requestingUserId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const existingRequestSnap = await getDocs(q);
    if (!existingRequestSnap.empty) {
      throw new Error("Access request already sent and is pending.");
    }

    // 3. Create the new request document
    await addDoc(this.accessRequestsCollection, {
      roomId: roomId,
      roomName: roomName,
      requestingUserId: requestingUserId,
      requestingUserName: requestingUserName,
      requestingUserProfilePic: requestingUserProfilePic || null,
      status: 'pending',
      requestedAt: Timestamp.now(),
      creatorId: creatorId // Store creator ID for querying
    } as Omit<AccessRequest, 'id'>);
  }

  // Get pending requests for a specific room (for the creator)
  getPendingRequestsForRoom(roomId: string): Observable<AccessRequest[]> {
    const q = query(
      this.accessRequestsCollection,
      where('roomId', '==', roomId),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<AccessRequest[]>;
  }

  // Get all pending requests for rooms created by a specific user
  getPendingRequestsForCreator(creatorId: string): Observable<AccessRequest[]> {
    const q = query(
      this.accessRequestsCollection,
      where('creatorId', '==', creatorId),
      where('status', '==', 'pending'),
      orderBy('requestedAt', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<AccessRequest[]>;
  }


  // Approve an access request
  async approveAccessRequest(requestId: string, roomId: string, userIdToAdd: string): Promise<void> {
    const requestRef = doc(this.firestore, 'accessRequests', requestId);
    const chatRoomRef = doc(this.firestore, 'chatRooms', roomId);

    // Use a batch write for atomicity
    const batch = writeBatch(this.firestore);

    // 1. Update the chat room: add userIdToAdd to participants array
    batch.update(chatRoomRef, {
      participants: arrayUnion(userIdToAdd) // Atomically add user ID
    });

    // 2. Update the request status to 'accepted'
    batch.update(requestRef, {
      status: 'accepted'
    });

    // Consider deleting accepted requests after some time?
    batch.delete(requestRef); // Or just delete immediately

    return batch.commit();
  }

  // Reject (or ignore) an access request
  async rejectAccessRequest(requestId: string): Promise<void> {
    const requestRef = doc(this.firestore, 'accessRequests', requestId);

    // Option 1: Update status to 'rejected' (keeps a record)
    return updateDoc(requestRef, {
      status: 'rejected'
    });

    // Option 2: Just delete the request document
    // return deleteDoc(requestRef);
  }

  // Add a participant directly (e.g., by creator manually - different from request approval)
  // Keep the old addParticipantToChatRoom method if needed for direct adds
  async addParticipantToChatRoom(chatRoomId: string, userId: string): Promise<void> {
    const chatRoomRef = doc(this.firestore, 'chatRooms', chatRoomId);
    // Check if room exists and user isn't already a participant (optional but good practice)
    const chatRoomSnap = await getDoc(chatRoomRef);
    if (!chatRoomSnap.exists()) {
      throw new Error('Chat room not found');
    }
    const chatRoom = chatRoomSnap.data() as ChatRoom;
    if (chatRoom.participants.includes(userId)) {
      console.warn(`User ${userId} is already a participant in room ${chatRoomId}`);
      return; // Already a participant
    }
    if (!chatRoom.isPrivate) {
      console.warn(`Cannot explicitly add participant ${userId} to public room ${chatRoomId}`);
      return; // Not applicable for public rooms
    }

    return updateDoc(chatRoomRef, { participants: arrayUnion(userId) });
  }


}
