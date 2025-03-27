import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ChatService, ChatMessage, ChatRoom } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Timestamp } from '@angular/fire/firestore';
import { Observable, Subscription } from 'rxjs';
import { Router } from '@angular/router';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  timeOutline,
  addCircleOutline,
  chatbubblesOutline,
  lockClosedOutline,
  sendOutline,
  trashOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { addIcons } from 'ionicons';
import {
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonButton,
  IonList, IonInput,
  IonItem,
  IonIcon, ToastController,

} from '@ionic/angular/standalone';
addIcons({
  timeOutline,
  addCircleOutline,
  chatbubblesOutline,
  lockClosedOutline,
  sendOutline,
  trashOutline,
  chevronForwardOutline
});

@Component({
  selector: 'app-group-chat',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="schedule-gradient">
        <ion-buttons *ngIf="isadmin" slot="start">
          <ion-back-button defaultHref="/manage-employees"></ion-back-button>
        </ion-buttons>
        <ion-buttons *ngIf="!isadmin" slot="start">
          <ion-back-button defaultHref="/employee-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title class="ion-text-center text-black">Group Chat</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="main-content">
      <div class="chat-container">
        <!-- Chat Rooms Sidebar -->
        <div class="chat-rooms-sidebar">
          <div class="sidebar-header">
            <h2>Chat Rooms</h2>
            <ion-button
              (click)="createChat()"
              fill="clear"
              class="create-room-btn"
            >
              <ion-icon name="add-circle-outline" ></ion-icon>
              New Room
            </ion-button>
          </div>

          <ion-list class="room-list" lines="none">
            <ion-item
              *ngFor="let room of chatRooms"
              (click)="selectChatRoom(room)"
              class="room-item animate__animated animate__fadeIn"
              [class.room-selected]="selectedChatRoom?.id === room.id"
              [class.room-restricted]="!canAccessRoom(room)"
            >
              <div class="room-status-indicator">
                <ion-icon
                  [name]="room.isPrivate ? 'lock-closed-outline' : 'chatbubbles-outline'"
                ></ion-icon>
              </div>
              <div class="room-details">
                <h2 class="room-name">{{ room.name }}</h2>
                <div class="room-meta">
                  <span>{{ room.participants.length }} participants</span>
                  <span *ngIf="room.isPrivate" class="private-tag">Private</span>
                </div>
              </div>
            </ion-item>
          </ion-list>
        </div>

        <!-- Chat Window -->
        <div class="chat-window" *ngIf="selectedChatRoom">
          <div class="chat-header">
            <ion-buttons slot="start">
              <ion-back-button
                (click)="selectedChatRoom = null"
                defaultHref="/chat-rooms"
              ></ion-back-button>
            </ion-buttons>
            <h2 class="chat-title">{{ selectedChatRoom.name }}</h2>
            <ion-button
              *ngIf="isRoomCreator"
              (click)="deleteChatRoom()"
              fill="clear"
            >
              <ion-icon name="trash-outline"></ion-icon>
            </ion-button>
          </div>

          <ng-container *ngIf="canAccessRoom(selectedChatRoom)">
            <div class="messages-container">
              <div
                *ngFor="let message of messages$ | async"
                class="message-card animate__animated animate__fadeIn"
                [class.message-sent]="message.senderId === currentUser?.id"
              >
                <div class="message-header">
                  <span class="sender">{{ message.senderName }}</span>
                  <span class="timestamp">
                    {{ message.timestamp.toDate() | date:'shortTime' }}
                  </span>
                </div>
                <div class="message-content">
                  {{ message.message }}
                </div>
              </div>
            </div>

            <div class="message-input-container">
              <ion-item class="message-input">
                <ion-input
                name="messageInput"
  [(ngModel)]="newMessage"
  placeholder="Type your message..."
  (keyup.enter)="sendMessage()"
                ></ion-input>
                <ion-button
                  (click)="sendMessage()"
                  [disabled]="!newMessage"
                  class="send-button"
                >
                  <ion-icon name="send-outline"></ion-icon>
                </ion-button>
              </ion-item>
            </div>
          </ng-container>

          <div *ngIf="!canAccessRoom(selectedChatRoom)" class="empty-state">
            <div class="empty-icon-container">
              <ion-icon name="lock-closed-outline"></ion-icon>
            </div>
            <h3>Restricted Access</h3>
            <p>You do not have access to this chat room</p>
            <ion-button
              (click)="requestAccess(selectedChatRoom)"
              fill="solid"
              class="request-access-btn"
            >
              Request Access
            </ion-button>
          </div>
        </div>

        <!-- No Room Selected State -->
        <div *ngIf="!selectedChatRoom" class="empty-state">
          <div class="empty-icon-container">
            <ion-icon name="chatbubbles-outline"></ion-icon>
          </div>
          <h3>Select a Chat Room</h3>
          <p>Choose a room from the sidebar to start chatting</p>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --theme-gradient: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      --theme-color-light: #2ecc71;
      --theme-color-dark: #27ae60;
      --theme-color-medium: rgba(39, 174, 96, 0.7);
      --card-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      --card-radius: 16px;
      --animation-duration: 0.3s;
    }

    .schedule-gradient {
      --background: var(--theme-gradient);
    }

    .main-content {
      --background: #f8f9fa;
      --padding-top: 12px;
    }

    .chat-container {
      display: flex;
      height: 100%;
      background: #f8f9fa;
    }

    .chat-rooms-sidebar {
      width: 300px;
      border-right: 1px solid #e0e0e0;
      background: white;
    }

    .sidebar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px;
      background: var(--theme-gradient);
      color: white;
    }

    .sidebar-header h2 {
      margin: 0;
      font-weight: 700;
      font-size: 18px;
    }

    .create-room-btn {
      --color: white;
      --padding-start: 0;
      --padding-end: 0;
    }

    .room-list {
      background: transparent;
      padding: 0 16px;
    }

    .room-item {
      --background: white;
      --padding-start: 0;
      --inner-padding-end: 0;
      border-radius: var(--card-radius);
      margin-bottom: 16px;
      box-shadow: var(--card-shadow);
      transition: transform var(--animation-duration) ease,
                  box-shadow var(--animation-duration) ease;
    }

    .room-item:active {
      transform: scale(0.98);
      box-shadow: 0 4px 10px rgba(0, 0, 0, 0.06);
    }

    .room-status-indicator {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f0f0f0;
      margin-right: 16px;
      transition: all 0.3s ease;

      ion-icon {
        font-size: 24px;
        color: var(--theme-color-dark);
      }
    }

    .room-details {
      flex: 1;
    }

    .room-name {
      font-weight: 700;
      font-size: 16px;
      margin: 0 0 8px 0;
      color: var(--ion-color-dark);
    }

    .room-meta {
      display: flex;
      justify-content: space-between;
      color: var(--ion-color-medium);
      font-size: 14px;
    }

    .private-tag {
      color: var(--theme-color-dark);
      font-weight: 600;
    }

    .room-item.room-selected {
      background: rgba(46, 204, 113, 0.1);
      box-shadow: 0 4px 12px rgba(46, 204, 113, 0.1);
    }

    .chat-window {
      flex-grow: 1;
      display: flex;
      flex-direction: column;
      background: white;
    }

    .chat-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px;
      background: var(--theme-gradient);
      color: white;

      .chat-title {
        margin: 0;
        font-weight: 700;
        flex-grow: 1;
        text-align: center;
      }
    }

    .messages-container {
      flex-grow: 1;
      overflow-y: auto;
      padding: 16px;
      background: #f8f9fa;
    }

    .message-card {
      max-width: 80%;
      margin-bottom: 16px;
      border-radius: var(--card-radius);
      box-shadow: var(--card-shadow);
      background: white;
      padding: 12px;
    }

    .message-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
      color: var(--ion-color-medium);
      font-size: 12px;
    }

    .message-sent {
      align-self: flex-end;
      background: var(--theme-gradient);
      color: white;
    }

    .message-input-container {
      padding: 16px;
      background: white;
      border-top: 1px solid #e0e0e0;
    }

    .message-input {
      border-radius: 24px;
      background: #f8f9fa;
    }

    .send-button {
      --background: var(--theme-gradient);
      --background-activated: var(--theme-color-dark);
      --border-radius: 50%;
      width: 48px;
      height: 48px;
    }

    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 64px 24px;
      text-align: center;
      flex-grow: 1;
    }

    .empty-icon-container {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: linear-gradient(135deg, rgba(46, 204, 113, 0.2) 0%, rgba(39, 174, 96, 0.2) 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 24px;

      ion-icon {
        font-size: 40px;
        color: var(--theme-color-dark);
      }
    }

    .empty-state h3 {
      margin: 0 0 8px;
      color: var(--ion-color-dark);
      font-weight: 700;
      font-size: 20px;
    }

    .empty-state p {
      margin: 0 0 16px;
      color: var(--ion-color-medium);
      font-size: 16px;
    }

    .request-access-btn {
      --background: var(--theme-gradient);
    }

    // Animation classes
    .animate__animated {
      animation-duration: 0.5s;
    }

    .animate__fadeIn {
      animation-name: fadeIn;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `],
  animations: [
    trigger('messageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('300ms', style({ opacity: 1, transform: 'translateY(0)' })),
      ])
    ])
  ],
  standalone: true,
  imports: [CommonModule, FormsModule, IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonList,
    IonItem,
    IonIcon, IonInput
  ]
})
export class GroupChatComponent implements OnInit, OnDestroy {


  navigateBack() {
    this.router.navigate(['/']);
  }


  messages$!: Observable<ChatMessage[]>;
  newMessage: string = '';
  currentUser: any = null;
  chatRooms: ChatRoom[] = [];
  selectedChatRoom: ChatRoom | null = null;
  isRoomCreator = false;
  private chatRoomsSubscription: Subscription | null = null;
  private userSubscription: Subscription | null = null;
  isadmin: boolean = false;
  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    this.userSubscription = this.authService.getCurrentUser().subscribe((user) => {
      this.currentUser = user;

      if (user?.uid) {
        // Get all chat rooms
        this.chatService.getAllChatRooms();

        // Subscribe to chat rooms
        this.chatRoomsSubscription = this.chatService.chatRooms$.subscribe(rooms => {
          this.chatRooms = rooms;
        });
      }
    });
  }

  ngOnDestroy() {
    this.chatRoomsSubscription?.unsubscribe();
    this.userSubscription?.unsubscribe();
  }

  canAccessRoom(room: ChatRoom): boolean {
    if (!this.currentUser || !room) return false;
    // Public rooms are always accessible
    // Private rooms are only accessible to participants
    return !room.isPrivate || room.participants.includes(this.currentUser.uid);
  }

  async selectChatRoom(room: ChatRoom) {
    if (this.canAccessRoom(room)) {
      this.selectedChatRoom = room;
      this.messages$ = this.chatService.getChatRoomMessages(room.id!);
      this.isRoomCreator = room.createdBy === this.currentUser.uid;
    } else {
      this.showToast('You do not have access to this chat room', 'danger');
    }
  }

  async sendMessage() {
    if (!this.newMessage.trim() || !this.selectedChatRoom || !this.canAccessRoom(this.selectedChatRoom)) return;

    const message: Omit<ChatMessage, 'id'> = {
      senderId: this.currentUser.uid,
      senderName: this.currentUser.name,
      message: this.newMessage,
      timestamp: Timestamp.now(),
      chatRoomId: this.selectedChatRoom.id!
    };

    try {
      await this.chatService.sendMessage(message);
      this.newMessage = '';
    } catch (error) {
      console.error('Error sending message', error);
      this.showToast('Error sending message', 'danger');
    }
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color
    });
    toast.present();
  }

  async createChat() {
    this.router.navigate(['/create-chat']);
  }

  async requestAccess(room: ChatRoom) {
    if (this.currentUser) {
      try {
        await this.chatService.addParticipantToChatRoom(room.id!, this.currentUser.uid);
        this.showToast('Access request sent', 'success');
      } catch (error) {
        console.error('Error requesting access', error);
        this.showToast('Error requesting access', 'danger');
      }
    }
  }

  async deleteChatRoom() {
    if (this.selectedChatRoom && this.isRoomCreator) {
      try {
        await this.chatService.deleteChatRoom(this.selectedChatRoom.id!, this.currentUser.uid);
        this.selectedChatRoom = null;
        this.showToast('Chat room deleted', 'success');
      } catch (error) {
        console.error('Error deleting chat room', error);
        this.showToast('Error deleting chat room', 'danger');
      }
    }
  }
}
