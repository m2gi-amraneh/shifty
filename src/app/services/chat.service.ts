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
  onSnapshot
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

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private chatRoomsSubject = new BehaviorSubject<ChatRoom[]>([]);
  chatRooms$ = this.chatRoomsSubject.asObservable();

  constructor(private firestore: Firestore) { }

  // Get all chat rooms
  getAllChatRooms(): void {
    const chatRoomCollection = collection(this.firestore, 'chatRooms');

    onSnapshot(chatRoomCollection, (snapshot) => {
      const chatRooms = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as ChatRoom));
      this.chatRoomsSubject.next(chatRooms);
    });
  }

  // Create a new chat room with simplified parameters
  async createChatRoom(
    roomName: string,
    participants: string[],
    createdBy: string,
    isPrivate: boolean = true
  ): Promise<any> {
    const chatRoomCollection = collection(this.firestore, 'chatRooms');
    return addDoc(chatRoomCollection, {
      name: roomName,
      participants: participants,
      createdBy: createdBy,
      createdAt: Timestamp.now(),
      isPrivate: isPrivate
    });
  }

  // Get messages for a specific chat room with real-time updates
  getChatRoomMessages(chatRoomId: string): Observable<ChatMessage[]> {
    const messagesCollection = collection(this.firestore, 'messages');
    const messageQuery = query(
      messagesCollection,
      where('chatRoomId', '==', chatRoomId),
      orderBy('timestamp', 'asc')
    );

    return collectionData(messageQuery, { idField: 'id' }) as Observable<ChatMessage[]>;
  }

  // Send a message to a chat room
  sendMessage(message: Omit<ChatMessage, 'id'>): Promise<any> {
    const messagesCollection = collection(this.firestore, 'messages');
    return addDoc(messagesCollection, message);
  }

  // Add a participant to a chat room
  async addParticipantToChatRoom(chatRoomId: string, userId: string): Promise<void> {
    const chatRoomRef = doc(this.firestore, 'chatRooms', chatRoomId);
    const chatRoomSnap = await getDocs(query(collection(this.firestore, 'chatRooms'), where('id', '==', chatRoomId)));

    if (chatRoomSnap.empty) {
      throw new Error('Chat room not found');
    }

    const chatRoom = chatRoomSnap.docs[0].data() as ChatRoom;

    // Only add if not already a participant
    if (!chatRoom.participants.includes(userId)) {
      const updatedParticipants = [...chatRoom.participants, userId];
      return updateDoc(chatRoomRef, { participants: updatedParticipants });
    }
  }

  // Delete a chat room (only by creator)
  deleteChatRoom(chatRoomId: string, userId: string): Promise<void> {
    const chatRoomRef = doc(this.firestore, 'chatRooms', chatRoomId);
    return deleteDoc(chatRoomRef);
  }

  // Check if user is allowed to access a chat room
  async canAccessChatRoom(chatRoomId: string, userId: string): Promise<boolean> {
    const chatRoomSnap = await getDocs(query(collection(this.firestore, 'chatRooms'), where('id', '==', chatRoomId)));

    if (chatRoomSnap.empty) return false;

    const chatRoom = chatRoomSnap.docs[0].data() as ChatRoom;
    return !chatRoom.isPrivate || chatRoom.participants.includes(userId);
  }
}
