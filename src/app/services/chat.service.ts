import { Injectable, OnDestroy } from '@angular/core';
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
  limit,
  serverTimestamp, // Import if using server timestamps
  Unsubscribe,
} from '@angular/fire/firestore';
import { Observable, BehaviorSubject, of, Subscription } from 'rxjs';
import { switchMap, tap, map, catchError } from 'rxjs/operators';
import { AuthService, UserMetadata } from './auth.service'; // Import AuthService

// Interfaces remain the same
export interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: Timestamp;
  chatRoomId: string; // Still needed to link messages to rooms within the business
}

export interface ChatRoom {
  id?: string;
  name: string;
  participants: string[]; // User UIDs within the business
  createdBy: string; // User UID
  createdAt: Timestamp;
  isPrivate: boolean;
  lastMessageTimestamp?: Timestamp; // Optional
}

export interface AccessRequest {
  id?: string;
  roomId: string;
  roomName: string;
  requestingUserId: string;
  requestingUserName: string;
  requestingUserProfilePic?: string;
  status: 'pending' | 'accepted' | 'rejected';
  requestedAt: Timestamp;
  creatorId: string; // UID of the room creator within the business
}

@Injectable({
  providedIn: 'root'
})
export class ChatService implements OnDestroy {
  private chatRoomsSubject = new BehaviorSubject<ChatRoom[]>([]);
  chatRooms$ = this.chatRoomsSubject.asObservable();

  // Listener management
  private roomsListenerUnsubscribe: Unsubscribe | null = null;
  private userMetadataSubscription: Subscription | null = null;

  constructor(
    private firestore: Firestore,
    private authService: AuthService // Inject AuthService
  ) {
    console.log("ChatService Initialized - Waiting for User Metadata");
    this.initializeTenantListeners();
  }

  /** Sets up the listeners scoped to the current tenant's businessId. */
  private initializeTenantListeners(): void {
    this.userMetadataSubscription = this.authService.userMetadata$.pipe(
      tap(metadata => console.log("ChatService: User metadata changed:", metadata)),
      switchMap(metadata => {
        // --- Teardown existing listener first ---
        this.teardownListeners();

        if (metadata?.businessId) {
          // --- User logged in with a valid businessId ---
          const businessId = metadata.businessId;
          const collectionPath = `business/${businessId}/chatRooms`;
          console.log(`ChatService: Setting up room listener for path: ${collectionPath}`);

          const q = query(
            collection(this.firestore, collectionPath),
            orderBy('createdAt', 'desc') // Example order
          );

          this.roomsListenerUnsubscribe = onSnapshot(q,
            (snapshot) => {
              const chatRooms = snapshot.docs.map(d => ({
                id: d.id,
                ...d.data()
              } as ChatRoom));
              console.log(`ChatService: Received ${chatRooms.length} chat rooms for ${businessId}`);
              this.chatRoomsSubject.next(chatRooms);
            },
            (error) => {
              console.error(`ChatService: Error listening to chat rooms for ${businessId}:`, error);
              this.chatRoomsSubject.next([]); // Clear on error
            }
          );
          return of(businessId); // Pass businessId down if needed, or just true
        } else {
          // --- User logged out or no businessId ---
          console.log("ChatService: User logged out or businessId missing. Listener stopped.");
          this.chatRoomsSubject.next([]); // Clear data
          return of(null); // Indicate inactive state
        }
      }),
      catchError(err => {
        console.error("ChatService: Error in userMetadata stream processing:", err);
        this.teardownListeners();
        this.chatRoomsSubject.next([]);
        return of(null); // Ensure stream continues but indicates failure
      })
    ).subscribe();
  }

  /** Unsubscribes from the active Firestore listener. */
  private teardownListeners(): void {
    if (this.roomsListenerUnsubscribe) {
      console.log("ChatService: Tearing down room listener.");
      this.roomsListenerUnsubscribe();
      this.roomsListenerUnsubscribe = null;
    }
    // Add teardown for other listeners if created (e.g., specific room messages)
  }

  /** Utility to get the current business ID or throw an error */
  private getCurrentBusinessIdOrFail(): string {
    const businessId = this.authService.getCurrentBusinessId();
    if (!businessId) {
      throw new Error("ChatService Error: User is not associated with a business.");
    }
    return businessId;
  }

  // --- Chat Room Operations (Tenant-Aware) ---

  /** Listens to all chat rooms for the CURRENT business. */
  listenToAllChatRooms(): () => void {
    // This method might seem redundant now as initializeTenantListeners handles it,
    // but keeping it provides an explicit way to re-trigger/confirm listening if needed,
    // and returns the unsubscribe function directly.
    // Ensure it doesn't create duplicate listeners.
    if (this.roomsListenerUnsubscribe) {
      console.warn("ChatService: listenToAllChatRooms called but listener already active.");
      // Return the existing unsubscribe function or a no-op
      return this.roomsListenerUnsubscribe || (() => { });
    }
    // If not active, the initializeTenantListeners should handle starting it
    // based on the userMetadata$ stream. We rely on that mechanism.
    console.log("ChatService: listenToAllChatRooms called, relying on existing stream logic.");
    // Return a function that calls the main teardown
    return () => this.teardownListeners();
  }

  /** Creates a new chat room within the current user's business. */
  async createChatRoom(
    roomName: string,
    participants: string[], // User UIDs within the business
    createdBy: string, // User UID
    isPrivate: boolean = true
  ): Promise<string | null> { // Return new room ID or null on failure
    const businessId = this.getCurrentBusinessIdOrFail();
    const collectionPath = `business/${businessId}/chatRooms`;
    const chatRoomCollection = collection(this.firestore, collectionPath);

    console.log(`ChatService: Creating room in ${collectionPath}`);
    try {
      const docRef = await addDoc(chatRoomCollection, {
        name: roomName,
        participants: participants,
        createdBy: createdBy,
        createdAt: Timestamp.now(),
        isPrivate: isPrivate,
        lastMessageTimestamp: null
      });
      console.log(`ChatService: Room created with ID: ${docRef.id} in ${businessId}`);
      return docRef.id;
    } catch (error) {
      console.error(`ChatService: Error creating room in ${businessId}:`, error);
      return null;
    }
  }

  /** Gets a single chat room from the current business. */
  async getChatRoom(chatRoomId: string): Promise<ChatRoom | null> {
    const businessId = this.getCurrentBusinessIdOrFail();
    const docPath = `business/${businessId}/chatRooms/${chatRoomId}`;
    const chatRoomRef = doc(this.firestore, docPath);

    try {
      const chatRoomSnap = await getDoc(chatRoomRef);
      if (chatRoomSnap.exists()) {
        return { id: chatRoomSnap.id, ...chatRoomSnap.data() } as ChatRoom;
      } else {
        console.warn(`ChatService: Room ${chatRoomId} not found in business ${businessId}.`);
        return null;
      }
    } catch (error) {
      console.error(`ChatService: Error fetching room ${chatRoomId} from ${businessId}:`, error);
      return null;
    }
  }

  /** Deletes a chat room within the current business (only by creator). */
  async deleteChatRoom(chatRoomId: string, userId: string): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail();
    const roomDocPath = `business/${businessId}/chatRooms/${chatRoomId}`;
    const chatRoomRef = doc(this.firestore, roomDocPath);

    const roomSnap = await getDoc(chatRoomRef);
    if (!roomSnap.exists()) throw new Error('Chat room not found');

    const roomData = roomSnap.data() as ChatRoom;
    if (roomData.createdBy !== userId) {
      throw new Error('Only the creator can delete this room');
    }

    console.log(`ChatService: Deleting room ${chatRoomId} and associated data in ${businessId}`);
    // Use a batch write for atomicity
    const batch = writeBatch(this.firestore);
    batch.delete(chatRoomRef); // Delete the room itself

    // Delete messages for this room within the business
    const messagesColPath = `business/${businessId}/messages`;
    const messagesQuery = query(collection(this.firestore, messagesColPath), where('chatRoomId', '==', chatRoomId));
    const messagesSnapshot = await getDocs(messagesQuery);
    messagesSnapshot.forEach(msgDoc => batch.delete(doc(this.firestore, messagesColPath, msgDoc.id))); // Use full path for message doc

    // Delete pending access requests for this room within the business
    const requestsColPath = `business/${businessId}/accessRequests`;
    const requestsQuery = query(collection(this.firestore, requestsColPath), where('roomId', '==', chatRoomId));
    const requestsSnapshot = await getDocs(requestsQuery);
    requestsSnapshot.forEach(reqDoc => batch.delete(doc(this.firestore, requestsColPath, reqDoc.id))); // Use full path for request doc

    await batch.commit();
    console.log(`ChatService: Room ${chatRoomId} and associated data deleted from ${businessId}`);
  }

  // Check access - This implicitly checks within the current business context
  // as getChatRoom is now tenant-aware.
  async canAccessChatRoom(chatRoomId: string, userId: string): Promise<boolean> {
    // getChatRoom will return null if the room doesn't exist *in the current business*
    const chatRoom = await this.getChatRoom(chatRoomId);
    if (!chatRoom) return false;
    if (!chatRoom.isPrivate) return true;
    return chatRoom.participants.includes(userId);
  }

  // --- Message Operations (Tenant-Aware) ---

  /** Gets messages for a specific chat room within the current business. */
  getChatRoomMessages(chatRoomId: string): Observable<ChatMessage[]> {
    // Use an observable that refetches the businessId in case it changes, though unlikely mid-stream
    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) return of([]); // No business context, return empty
        const businessId = metadata.businessId;
        const messagesCollectionPath = `business/${businessId}/messages`;
        const messagesCollection = collection(this.firestore, messagesCollectionPath);
        const messageQuery = query(
          messagesCollection,
          where('chatRoomId', '==', chatRoomId),
          orderBy('timestamp', 'asc')
        );
        console.log(`ChatService: Setting up message listener for room ${chatRoomId} in ${businessId}`);
        // collectionData handles listener setup/teardown internally based on observable lifecycle
        return collectionData(messageQuery, { idField: 'id' }) as Observable<ChatMessage[]>;
      }),
      catchError(err => {
        console.error(`ChatService: Error getting messages for room ${chatRoomId}:`, err);
        return of([]); // Return empty array on error
      })
    );
  }

  /** Sends a message associated with a chat room within the current business. */
  async sendMessage(message: Omit<ChatMessage, 'id'>): Promise<boolean> {
    const businessId = this.getCurrentBusinessIdOrFail();
    const collectionPath = `business/${businessId}/messages`;
    const messagesCollection = collection(this.firestore, collectionPath);

    console.log(`ChatService: Sending message to room ${message.chatRoomId} in ${businessId}`);
    try {
      // Ensure timestamp is set (might already be done in component)
      const messageToSend = {
        ...message,
        timestamp: message.timestamp || Timestamp.now() // Ensure timestamp exists
      };
      await addDoc(messagesCollection, messageToSend);
      return true;
    } catch (error) {
      console.error(`ChatService: Error sending message in ${businessId}:`, error);
      return false;
    }
  }

  // --- Access Request Operations (Tenant-Aware) ---

  /** Creates an access request for a room within the current business. */
  async requestAccess(
    roomId: string,
    roomName: string,
    requestingUserId: string,
    requestingUserName: string,
    creatorId: string,
    requestingUserProfilePic?: string
  ): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail(); // Ensures we have context

    // 1. Check participation and pending request *within the current business context*
    const room = await this.getChatRoom(roomId); // Already tenant-aware
    if (room && room.participants.includes(requestingUserId)) {
      throw new Error("You are already a participant in this room.");
    }
    if (room && !room.isPrivate) {
      throw new Error("This room is public, no request needed.");
    }

    const requestsCollectionPath = `business/${businessId}/accessRequests`;
    const requestsCollection = collection(this.firestore, requestsCollectionPath);
    const q = query(
      requestsCollection,
      where('roomId', '==', roomId),
      where('requestingUserId', '==', requestingUserId),
      where('status', '==', 'pending'),
      limit(1)
    );
    const existingRequestSnap = await getDocs(q);
    if (!existingRequestSnap.empty) {
      throw new Error("Access request already sent and is pending.");
    }

    // 3. Create the new request document within the business subcollection
    console.log(`ChatService: Creating access request in ${requestsCollectionPath}`);
    await addDoc(requestsCollection, {
      roomId: roomId,
      roomName: roomName,
      requestingUserId: requestingUserId,
      requestingUserName: requestingUserName,
      requestingUserProfilePic: requestingUserProfilePic || null,
      status: 'pending',
      requestedAt: Timestamp.now(),
      creatorId: creatorId // Stays the same (user ID)
    } as Omit<AccessRequest, 'id'>);
  }

  /** Gets pending requests for a specific room within the current business. */
  getPendingRequestsForRoom(roomId: string): Observable<AccessRequest[]> {
    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) return of([]);
        const businessId = metadata.businessId;
        const collectionPath = `business/${businessId}/accessRequests`;
        const q = query(
          collection(this.firestore, collectionPath),
          where('roomId', '==', roomId),
          where('status', '==', 'pending'),
          orderBy('requestedAt', 'asc')
        );
        console.log(`ChatService: Setting up pending requests listener for room ${roomId} in ${businessId}`);
        return collectionData(q, { idField: 'id' }) as Observable<AccessRequest[]>;
      }),
      catchError(err => {
        console.error(`ChatService: Error getting pending requests for room ${roomId}:`, err);
        return of([]);
      })
    );
  }

  // Get pending requests for a specific creator within the current business
  // Note: creatorId is still a user UID, the query is scoped by business path
  getPendingRequestsForCreator(creatorId: string): Observable<AccessRequest[]> {
    return this.authService.userMetadata$.pipe(
      switchMap(metadata => {
        if (!metadata?.businessId) return of([]);
        const businessId = metadata.businessId;
        const collectionPath = `business/${businessId}/accessRequests`;
        const q = query(
          collection(this.firestore, collectionPath),
          where('creatorId', '==', creatorId),
          where('status', '==', 'pending'),
          orderBy('requestedAt', 'asc')
        );
        console.log(`ChatService: Setting up pending requests listener for creator ${creatorId} in ${businessId}`);
        return collectionData(q, { idField: 'id' }) as Observable<AccessRequest[]>;
      }),
      catchError(err => {
        console.error(`ChatService: Error getting pending requests for creator ${creatorId}:`, err);
        return of([]);
      })
    );
  }

  /** Approves an access request within the current business. */
  async approveAccessRequest(requestId: string, roomId: string, userIdToAdd: string): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail();
    const requestDocPath = `business/${businessId}/accessRequests/${requestId}`;
    const chatRoomDocPath = `business/${businessId}/chatRooms/${roomId}`;

    const requestRef = doc(this.firestore, requestDocPath);
    const chatRoomRef = doc(this.firestore, chatRoomDocPath);

    console.log(`ChatService: Approving request ${requestId} for room ${roomId} in ${businessId}`);
    const batch = writeBatch(this.firestore);

    // 1. Update chat room participants (within the business)
    batch.update(chatRoomRef, {
      participants: arrayUnion(userIdToAdd)
    });

    // 2. Delete the request (within the business)
    batch.delete(requestRef);

    await batch.commit();
    console.log(`ChatService: Request ${requestId} approved and user ${userIdToAdd} added to room ${roomId} in ${businessId}`);
  }

  /** Rejects (deletes) an access request within the current business. */
  async rejectAccessRequest(requestId: string): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail();
    const requestDocPath = `business/${businessId}/accessRequests/${requestId}`;
    const requestRef = doc(this.firestore, requestDocPath);

    console.log(`ChatService: Rejecting (deleting) request ${requestId} in ${businessId}`);
    await deleteDoc(requestRef);
    console.log(`ChatService: Request ${requestId} deleted from ${businessId}`);
  }

  /** Adds a participant directly to a room within the current business. */
  async addParticipantToChatRoom(chatRoomId: string, userId: string): Promise<void> {
    const businessId = this.getCurrentBusinessIdOrFail();
    const chatRoomDocPath = `business/${businessId}/chatRooms/${chatRoomId}`;
    const chatRoomRef = doc(this.firestore, chatRoomDocPath);

    // Check if room exists and user isn't already a participant
    const chatRoomSnap = await getDoc(chatRoomRef);
    if (!chatRoomSnap.exists()) throw new Error('Chat room not found');

    const chatRoom = chatRoomSnap.data() as ChatRoom;
    if (chatRoom.participants.includes(userId)) {
      console.warn(`User ${userId} is already a participant in room ${chatRoomId} in ${businessId}`);
      return;
    }
    if (!chatRoom.isPrivate) {
      console.warn(`Cannot explicitly add participant ${userId} to public room ${chatRoomId} in ${businessId}`);
      return;
    }

    console.log(`ChatService: Adding participant ${userId} to room ${chatRoomId} in ${businessId}`);
    await updateDoc(chatRoomRef, { participants: arrayUnion(userId) });
    console.log(`ChatService: Participant ${userId} added to room ${chatRoomId} in ${businessId}`);
  }

  // --- Cleanup ---
  ngOnDestroy(): void {
    console.log("ChatService: Destroying - Tearing down listeners and subscription.");
    this.teardownListeners(); // Unsubscribe from Firestore listener
    if (this.userMetadataSubscription) {
      this.userMetadataSubscription.unsubscribe(); // Unsubscribe from AuthService
    }
  }
}