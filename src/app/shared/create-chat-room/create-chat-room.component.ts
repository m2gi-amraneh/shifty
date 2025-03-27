import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Router } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { ChatService, ChatRoom } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Timestamp } from '@angular/fire/firestore';
import { UsersService } from 'src/app/services/users.service';
import { animate, style, transition, trigger } from '@angular/animations';
import {
  IonHeader, IonAvatar, IonLabel,
  IonToolbar,
  IonButtons,
  IonBackButton, IonToggle,
  IonTitle,
  IonContent, IonInput,
  IonButton,
  IonList, IonCheckbox, IonImg,
  IonItem,
  IonIcon, ToastController

} from '@ionic/angular/standalone';
@Component({
  selector: 'app-create-chat',
  template: `

      <ion-header class="ion-no-border">
        <ion-toolbar class="header-toolbar">
          <ion-buttons slot="start">
            <ion-back-button
              defaultHref="/group-chat"
              color="light"
              (click)="navigateBack()"
            ></ion-back-button>
          </ion-buttons>
          <ion-title color="light">Create Chat Room</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content>


            <div class="form-header">

              <p>Set up a new conversation space</p>
            </div>

            <div class="form-content">
              <div class="input-group">
                <ion-item class="custom-input">
                  <ion-label position="floating">Room Name</ion-label>
                  <ion-input
                    [(ngModel)]="roomName"
                    required
                    maxlength="50"
                    (ionChange)="validateRoomName()"
                  ></ion-input>
                </ion-item>
                <p *ngIf="!isValidRoomName" class="error-text">
                  Room name must be 1-50 characters
                </p>
              </div>

              <div class="toggle-group">
                <ion-item lines="none">
                  <ion-label class="font-semibold">Private Room</ion-label>
                  <ion-toggle
                    [(ngModel)]="isPrivate"
                    color="success"
                  ></ion-toggle>
                </ion-item>
              </div>

              <div class="participants-section">
                <h3>Select Participants</h3>

                <ion-list
                  *ngIf="(users$ | async) as users"
                  class="participants-list"
                >
                  <ion-item
                    *ngFor="let user of users"
                    class="participant-item"
                    [class.selected]="user.selected"
                  >
                    <ion-avatar slot="start">
                    <ion-img
                        src="https://ionicframework.com/docs/img/demos/avatar.svg"
                        alt="user avatar">
                  </ion-img>
                    </ion-avatar>
                    <ion-label>
                      <h3>{{ user.name }}</h3>
                    </ion-label>
                    <ion-checkbox
                      [(ngModel)]="user.selected"
                      (ionChange)="updateSelectedParticipants(user)"
                      color="success"
                    ></ion-checkbox>
                  </ion-item>
                </ion-list>
              </div>

              <div class="action-section">
                <ion-button
                  expand="block"
                  (click)="createChatRoom()"
                  [disabled]="!isValidRoomName"
                  class="create-button"
                >
                  Create Room
                  <ion-icon name="add-circle" slot="end"></ion-icon>
                </ion-button>
              </div>
            </div>


      </ion-content>

  `,
  styles: [`
    :host {
      --primary-gradient: linear-gradient(135deg, #2ecc71 0%, #27ae60 100%);
      --primary-color: #2ecc71;
      --primary-light: rgba(46, 204, 113, 0.15);
      --text-light: #ffffff;
      --text-dark: #333333;
      --card-bg: #ffffff;
      --card-shadow: 0 8px 20px rgba(46, 204, 113, 0.1);
      --border-radius: 16px;
    }

    .create-chat-container {
      height: 100vh;
      background-color: #f9f9f9;
    }

    .header-toolbar {
      --background: var(--primary-gradient);
      --border-width: 0;
    }

    .content-container {
      display: flex;
      justify-content: center;
      align-items: center;
      height: calc(100% - 56px);
      padding: 0 16px;
    }

    .form-card {
      width: 100%;
      max-width: 500px;
      background: var(--card-bg);
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      overflow: hidden;
      animation: fadeIn 0.5s ease;
    }

    .form-header {
      background: var(--primary-gradient);
      color: var(--text-light);
      padding: 20px 16px;
      text-align: center;
    }

    .form-header h2 {
      margin: 0 0 8px;
      font-size: 20px;
      font-weight: 700;
    }

    .form-header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .form-content {
      padding: 20px 16px;
    }

    .custom-input {
      --background: var(--primary-light);
      --border-radius: 12px;
      margin-bottom: 16px;
    }

    .error-text {
      color: #ef5350;
      font-size: 12px;
      margin: -10px 0 16px 10px;
    }

    .toggle-group {
      margin-bottom: 20px;
    }

    .participants-section h3 {
      font-size: 16px;
      margin: 0 0 16px;
      color: var(--text-dark);
    }

    .participants-list {
      max-height: 250px;
      overflow-y: auto;
      background: var(--primary-light);
      border-radius: var(--border-radius);
      padding: 8px;
    }

    .participant-item {
      --background: transparent;
      --inner-padding-end: 0;
      margin-bottom: 8px;
      border-radius: 12px;
      transition: background-color 0.3s ease;
    }

    .participant-item.selected {
      background-color: rgba(46, 204, 113, 0.2);
    }

    .participant-item ion-avatar {
      width: 40px;
      height: 40px;
      margin-right: 12px;
    }

    .action-section {
      margin-top: 20px;
    }

    .create-button {
      --background: var(--primary-gradient);
      --background-hover: var(--primary-gradient);
      --background-activated: var(--primary-gradient);
      --border-radius: 12px;
      min-height: 50px;
      font-weight: 600;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
  standalone: true,
  imports: [CommonModule, FormsModule, IonToolbar,
    IonButtons,
    IonBackButton,
    IonTitle,
    IonContent,
    IonButton,
    IonList, IonInput, IonCheckbox, IonImg,
    IonItem,
    IonIcon, IonHeader, IonAvatar, IonToggle, IonLabel,]
})
export class CreateChatComponent implements OnInit, OnDestroy {

  roomName: string = '';
  isPrivate: boolean = false;
  isValidRoomName: boolean = false;
  users$: Observable<any[]>;
  selectedParticipants: string[] = [];
  currentUser: any = null;

  private userSubscription: Subscription | null = null;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private usersService: UsersService
  ) {
    this.users$ = this.usersService.getAllUsers();
  }

  ngOnInit() {
    this.userSubscription = this.authService.getCurrentUser().subscribe(currentUser => {
      this.currentUser = currentUser;

      if (currentUser?.uid) {
        this.selectedParticipants = [currentUser.uid];
      }
    });
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
  }

  validateRoomName() {
    this.isValidRoomName = this.roomName.trim().length > 0 && this.roomName.trim().length <= 50;
  }

  updateSelectedParticipants(user: any) {
    if (user.selected && !this.selectedParticipants.includes(user.id)) {
      this.selectedParticipants.push(user.id);
    } else if (!user.selected) {
      this.selectedParticipants = this.selectedParticipants.filter(id => id !== user.id);
    }
  }

  async createChatRoom() {
    if (!this.isValidRoomName) {
      this.showToast('Please enter a valid room name', 'danger');
      return;
    }

    try {
      if (!this.currentUser) {
        this.showToast('You must be logged in to create a chat room', 'danger');
        return;
      }

      if (!this.selectedParticipants.includes(this.currentUser.uid)) {
        this.selectedParticipants.push(this.currentUser.uid);
      }

      await this.chatService.createChatRoom(
        this.roomName.trim(),
        this.selectedParticipants,
        this.currentUser.uid,
        this.isPrivate
      );

      this.navigateBack();
    } catch (error) {
      console.error('Error creating chat room', error);
      this.showToast('Failed to create chat room', 'danger');
    }
  }

  navigateBack() {
    this.router.navigate(['/chat-rooms']);
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000,
      color: color
    });
    toast.present();
  }
}
