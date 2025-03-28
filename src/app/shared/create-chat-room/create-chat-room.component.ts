import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, Subscription, firstValueFrom } from 'rxjs'; // Import firstValueFrom
import { ChatService, ChatRoom } from '../../services/chat.service';
import { AuthService } from '../../services/auth.service';
import { Timestamp } from '@angular/fire/firestore';
import { UsersService } from 'src/app/services/users.service'; // Keep UsersService
import { animate, style, transition, trigger } from '@angular/animations';
import {
  IonHeader, IonAvatar, IonLabel,
  IonToolbar,
  IonButtons,
  IonBackButton, IonToggle,
  IonTitle,
  IonContent, IonInput, IonSpinner,
  IonButton,
  IonList, IonCheckbox, IonImg,
  IonItem,
  IonIcon, ToastController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons'; // Import addIcons
import { addCircle } from 'ionicons/icons'; // Import specific icons
import { FilterCurrentUserPipe } from 'src/app/pipe/filter-current-user-pipe.pipe';

addIcons({ addCircle }); // Register icons

@Component({
  selector: 'app-create-chat',
  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="header-toolbar">
        <ion-buttons slot="start">
          <ion-back-button
            defaultHref="/chat-rooms"
            color="dark"
            (click)="navigateBack()"
          ></ion-back-button>
        </ion-buttons>
        <ion-title color="dark">Create Chat Room</ion-title>
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
           <p class="toggle-description">
             {{ isPrivate ? 'Only selected participants can join.' : 'Anyone can join this room.' }}
           </p>
        </div>

        <!-- Participants section only shown for private rooms -->
        <div class="participants-section" *ngIf="isPrivate">
          <h3>Select Participants</h3>
           <p class="participants-note">You will automatically be included.</p>

          <ion-list
            *ngIf="(users$ | async) as users"
            class="participants-list"
          >
            <!-- Filter out the current user from the list -->
            <ion-item
              *ngFor="let user of users | filterCurrentUser:currentUser?.uid"
              class="participant-item"
              [class.selected]="user.selected"
            >
              <ion-avatar slot="start">
                <ion-img
                    [src]="user.profilePicture || 'https://ionicframework.com/docs/img/demos/avatar.svg'"
                    alt="user avatar">
                </ion-img>
              </ion-avatar>
              <ion-label>
                <!-- Use displayName or fall back -->
                <h3>{{ user.displayName || user.email || 'Unknown User' }}</h3>
              </ion-label>
              <ion-checkbox
                [(ngModel)]="user.selected"
                (ionChange)="updateSelectedParticipants(user)"
                color="success"
                [disabled]="user.id === currentUser?.uid"
              ></ion-checkbox>
            </ion-item>
          </ion-list>
        </div>

        <div class="action-section">
          <ion-button
            expand="block"
            (click)="createChatRoom()"
            [disabled]="!isValidRoomName || creatingRoom"
            class="create-button"
          >
             <ion-spinner *ngIf="creatingRoom" name="dots" slot="start"></ion-spinner>
            {{ creatingRoom ? 'Creating...' : 'Create Room' }}
            <ion-icon *ngIf="!creatingRoom" name="add-circle" slot="end"></ion-icon>
          </ion-button>
        </div>
      </div>
    </ion-content>
  `,
  styles: [`
    /* Existing styles... */
    .toggle-description {
        font-size: 0.8em;
        color: var(--medium-color, #889696);
        padding: 0 16px 10px 16px; /* Match item padding */
        margin-top: -10px; /* Pull up slightly */
    }
    .participants-note {
        font-size: 0.8em;
        color: var(--medium-color, #889696);
        padding: 0 0 10px 0; /* Match item padding */
    }

    .participants-list ion-item[disabled] {
      opacity: 0.6;
      pointer-events: none;
    }

     .participant-item ion-avatar ion-img {
       border-radius: 50%; /* Ensure avatar images are round */
     }

    /* Add other styles from the original component */
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

    .header-toolbar {

      --border-width: 0;
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

     .custom-input ion-label {
        color: #555; /* Slightly darker label */
     }

    .error-text {
      color: #ef5350;
      font-size: 12px;
      margin: -10px 0 16px 10px;
    }

    .toggle-group {
      margin-bottom: 20px;
      background-color: var(--primary-light); /* Background for toggle item */
      border-radius: 12px; /* Match input style */
      overflow: hidden; /* Contain background */
    }

    .toggle-group ion-item {
        --background: transparent; /* Make item transparent */
    }

    .participants-section h3 {
      font-size: 16px;
      margin: 0 0 8px; /* Reduced bottom margin */
      color: var(--text-dark);
    }

    .participants-list {
      max-height: 250px;
      overflow-y: auto;
      background: var(--primary-light);
      border-radius: var(--border-radius);
      padding: 8px;
      margin-bottom: 20px; /* Space below list */
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
  imports: [
    CommonModule,
    FormsModule,
    IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, IonButton,
    IonList, IonInput, IonCheckbox, IonImg, IonItem, IonIcon, IonHeader,
    IonAvatar, IonToggle, IonLabel, IonSpinner, // Added IonSpinner

    // Add a Pipe to filter the current user from the list
    FilterCurrentUserPipe
  ]
})
export class CreateChatComponent implements OnInit, OnDestroy {

  roomName: string = '';
  isPrivate: boolean = true; // Default to private
  isValidRoomName: boolean = false;
  users$: Observable<any[]>;
  selectedParticipants: string[] = [];
  currentUser: any = null;
  creatingRoom = false; // Loading state

  private userSubscription: Subscription | null = null;
  private usersSubscription: Subscription | null = null; // To manage the users observable if needed

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private router: Router,
    private toastController: ToastController,
    private usersService: UsersService
  ) {
    // Fetch users only once or manage subscription properly
    this.users$ = this.usersService.getAllUsers();
  }

  ngOnInit() {
    this.userSubscription = this.authService.getCurrentUser().subscribe(currentUser => {
      this.currentUser = currentUser;
      // Reset selected participants when user changes, always include current user
      if (currentUser?.uid) {
        // Automatically include the creator in the participants list
        this.selectedParticipants = [currentUser.uid];
      } else {
        this.selectedParticipants = []; // Clear if no user
      }
    });
    // Initial validation check if needed
    this.validateRoomName();
  }

  ngOnDestroy() {
    this.userSubscription?.unsubscribe();
    this.usersSubscription?.unsubscribe(); // Unsubscribe if you subscribed manually
  }

  validateRoomName() {
    this.isValidRoomName = this.roomName.trim().length > 0 && this.roomName.trim().length <= 50;
  }

  // This method is now only relevant when isPrivate is true
  updateSelectedParticipants(user: any) {
    if (!this.currentUser || user.id === this.currentUser.uid) {
      return; // Do not allow deselecting the creator
    }

    if (user.selected && !this.selectedParticipants.includes(user.id)) {
      this.selectedParticipants.push(user.id);
    } else if (!user.selected) {
      this.selectedParticipants = this.selectedParticipants.filter(id => id !== user.id);
    }
    // console.log('Selected Participants:', this.selectedParticipants);
  }

  async createChatRoom() {
    if (!this.isValidRoomName || this.creatingRoom) {
      if (!this.isValidRoomName) {
        this.showToast('Please enter a valid room name', 'danger');
      }
      return;
    }

    if (!this.currentUser?.uid) {
      this.showToast('You must be logged in to create a chat room', 'danger');
      return;
    }

    this.creatingRoom = true; // Set loading state

    let participantsToCreate: string[] = [];

    if (this.isPrivate) {
      // Ensure creator is always included for private rooms
      if (!this.selectedParticipants.includes(this.currentUser.uid)) {
        this.selectedParticipants.push(this.currentUser.uid);
      }
      participantsToCreate = [...this.selectedParticipants]; // Use the selected list

      // Optional: Minimum participants check for private rooms
      if (participantsToCreate.length < 1) { // Or < 2 if you require at least one other person
        this.showToast('Private rooms require at least one participant (yourself).', 'warning');
        this.creatingRoom = false;
        return;
      }

    } else {
      // Public room: participants array is empty by definition here.
      // Access is determined by the isPrivate flag later.
      // The creator's ID is stored in the 'createdBy' field.
      participantsToCreate = [];
    }

    try {
      console.log('Creating room:', this.roomName.trim(), 'Private:', this.isPrivate, 'Participants:', participantsToCreate, 'Creator:', this.currentUser.uid);

      await this.chatService.createChatRoom(
        this.roomName.trim(),
        participantsToCreate,
        this.currentUser.uid,
        this.isPrivate
      );

      this.showToast('Chat room created successfully!', 'success');
      this.navigateBack(); // Navigate back on success

    } catch (error) {
      console.error('Error creating chat room', error);
      this.showToast('Failed to create chat room. Please try again.', 'danger');
    } finally {
      this.creatingRoom = false; // Reset loading state
    }
  }

  navigateBack() {
    // Navigate to the main chat list
    this.router.navigate(['/chat-rooms']);
  }

  async showToast(message: string, color: string = 'primary') {
    const toast = await this.toastController.create({
      message: message,
      duration: 2500, // Slightly longer duration
      color: color,
      position: 'bottom' // Position at the bottom
    });
    toast.present();
  }
}
