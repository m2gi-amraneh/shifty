import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, NavigationEnd } from '@angular/router';
import { trigger, transition, style, animate } from '@angular/animations';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonButton, IonList, IonInput, IonItem, IonIcon, IonLabel, IonAvatar,
  IonSplitPane, IonMenu, IonMenuToggle, IonFooter, IonSpinner, IonNote,
  IonRippleEffect, IonBadge, IonSearchbar, // Ionic Components used
  IonListHeader, // Added if needed for list headers
  IonRefresher, IonRefresherContent // Added for pull-to-refresh
} from '@ionic/angular/standalone';
import { ToastController, AlertController, MenuController } from '@ionic/angular/standalone';
// Removed direct Firestore imports as service handles them
// import { collection, getDocs, limit, query, Timestamp, where } from '@angular/fire/firestore';
import { Observable, Subscription, of, filter, tap, finalize, distinctUntilChanged, switchMap, BehaviorSubject, combineLatest, catchError } from 'rxjs'; // Added catchError
import { addIcons } from 'ionicons';
import {
  chatbubblesOutline, addCircleOutline, lockClosedOutline, sendOutline, trashOutline,
  ellipsisVertical, chevronBackOutline, personCircleOutline, timeOutline,
  informationCircleOutline, closeCircleOutline, checkmarkCircleOutline, searchOutline,
  peopleOutline, chevronForwardOutline, checkmarkOutline, closeOutline,
  personAddOutline, cloudOfflineOutline // Added for error state
} from 'ionicons/icons';

// Import Services directly (adjust path if needed)
import { ChatService, ChatMessage, ChatRoom, AccessRequest } from '../../services/chat.service'; // Already tenant-aware
import { AuthService, UserMetadata } from '../../services/auth.service'; // Import UserMetadata
import { UsersService } from '../../services/users.service'; // Needed for user details potentially
import { ChangeDetectorRef, Component, ElementRef, inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { collection, getDocs, limit, query, Timestamp, where } from 'firebase/firestore';
// Removed unused 'user' import from '@angular/fire/auth'

// Add all necessary icons
addIcons({
  chatbubblesOutline, addCircleOutline, lockClosedOutline, sendOutline, trashOutline,
  ellipsisVertical, chevronBackOutline, personCircleOutline, timeOutline,
  informationCircleOutline, closeCircleOutline, checkmarkCircleOutline, searchOutline,
  peopleOutline, chevronForwardOutline, checkmarkOutline, closeOutline,
  personAddOutline, cloudOfflineOutline // Added
});

@Component({
  selector: 'app-group-chat',
  // --- Template remains IDENTICAL to the previous version ---
  template: `
    <!-- Responsive Split Pane Layout -->
    <ion-split-pane contentId="main-chat-area" when="md">

      <!-- Sidebar Menu (Chat Rooms List) -->
      <ion-menu contentId="main-chat-area" type="overlay">
        <ion-header class="ion-no-border">
          <ion-toolbar color="light">
            <ion-title class="menu-title">Chat Rooms</ion-title>
          </ion-toolbar>
        </ion-header>
        <ion-content color="light">
          <div class="sidebar-controls">
             <!-- Optional Search -->
             <!-- <ion-searchbar animated="true" placeholder="Search Rooms"></ion-searchbar> -->
             <ion-button expand="block" fill="clear" (click)="createChat()" class="new-room-btn" ion-ripple-effect>
               <ion-icon slot="start" name="add-circle-outline" color="primary"></ion-icon>
               Create New Room
             </ion-button>
          </div>

          <ion-list lines="none" class="room-list">
            <!-- Room Loading Indicator -->
            <div *ngIf="roomsLoading" class="loading-indicator ion-padding ion-text-center">
                <ion-spinner name="crescent" color="primary"></ion-spinner>
                <p>Loading rooms...</p>
            </div>

            <!-- Room List Items -->
            <ng-container *ngIf="!roomsLoading">
              <ion-item
                *ngFor="let room of chatRooms; trackBy: trackByRoomId"
                button
                (click)="selectChatRoom(room)"
                class="room-item"
                [class.room-selected]="selectedChatRoom?.id === room.id"
                [detail]="false"
                ion-ripple-effect
              >
                <ion-avatar slot="start" class="room-avatar" [class.private]="room.isPrivate">
                  <!-- Display profile pic of creator or generic icon -->
                   <ion-icon [name]="room.isPrivate ? 'lock-closed-outline' : 'chatbubbles-outline'" color="medium"></ion-icon>
                </ion-avatar>
                <ion-label>
                  <h2 class="room-name">{{ room.name }}</h2>
                  <!-- Participant count OR 'Public' -->
                  <p class="room-meta">
                    <ion-icon [name]="room.isPrivate ? 'people-outline' : 'chatbubbles-outline'"></ion-icon>
                    {{ room.isPrivate ? (room.participants.length + ' member' + (room.participants.length !== 1 ? 's' : '')) : 'Public' }}
                  </p>
                </ion-label>
                 <!-- Optional: Last activity time -->
                 <!-- <ion-note slot="end" color="medium" class="room-time">{{ room.lastMessageTimestamp?.toDate() | date:'shortTime' }}</ion-note> -->
              </ion-item>

              <!-- Empty Room List State -->
              <div *ngIf="!roomsLoading && chatRooms.length === 0" class="empty-list ion-padding ion-text-center">
                <ion-icon name="chatbubbles-outline" class="empty-icon" color="medium"></ion-icon>
                <p>No chat rooms in this business yet.</p> <!-- Adjusted text -->
                <p>Tap 'Create New Room' to start!</p>
              </div>
            </ng-container>
          </ion-list>
        </ion-content>
      </ion-menu>

      <!-- Main Chat Content Area -->
      <div class="ion-page" id="main-chat-area">
        <ion-header class="ion-no-border">
          <ion-toolbar>
             <!-- Menu toggle button -->
            <ion-buttons slot="start">
              <ion-menu-toggle>
                <ion-button fill="clear">
                  <ion-icon slot="icon-only" name="ellipsis-vertical" color="primary"></ion-icon>
                </ion-button>
              </ion-menu-toggle>
              <!-- Back Button Logic -->
               <ion-button *ngIf="selectedChatRoom" (click)="deselectChatRoom()" color="primary">
                  <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
               </ion-button>
               <ion-button *ngIf="!selectedChatRoom && !canGoBack" (click)="navigateBackBasedOnRole()" color="primary">
                  <ion-icon slot="icon-only" name="chevron-back-outline"></ion-icon>
               </ion-button>
               <ion-back-button *ngIf="!selectedChatRoom && canGoBack" defaultHref="/" color="primary"></ion-back-button>
            </ion-buttons>

            <!-- Dynamic Title -->
            <ion-title *ngIf="selectedChatRoom" class="chat-header-title">{{ selectedChatRoom.name }}</ion-title>
            <ion-title *ngIf="!selectedChatRoom" class="chat-header-title">Group Chat</ion-title>

            <ion-buttons slot="end">
                <!-- Pending Requests Toggle Button -->
                <ion-button
                    *ngIf="isRoomCreator && selectedChatRoom?.isPrivate"
                    fill="clear"
                    (click)="toggleRequestsSection()"
                    [color]="hasPendingRequests ? 'warning' : 'medium'"
                    class="requests-toggle-btn"
                    [disabled]="(pendingRequests$ | async)?.length === 0 && !showPendingRequests"
                    >
                    <ion-icon slot="icon-only" name="person-add-outline"></ion-icon>
                    <ion-badge *ngIf="hasPendingRequests" color="warning" slot="end" class="requests-badge">{{ (pendingRequests$ | async)?.length }}</ion-badge>
                </ion-button>

               <!-- Delete Button (only for creator) -->
               <ion-button *ngIf="isRoomCreator && selectedChatRoom" fill="clear" color="danger" (click)="presentDeleteConfirm()">
                 <ion-icon slot="icon-only" name="trash-outline"></ion-icon>
               </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content [scrollY]="true" class="chat-content" #chatContent>
            <!-- Optional: Pull to refresh -->
             <ion-refresher slot="fixed" (ionRefresh)="handleRefresh($event)">
               <ion-refresher-content></ion-refresher-content>
             </ion-refresher>

            <!-- PENDING REQUESTS SECTION (for creator) -->
            <div *ngIf="isRoomCreator && selectedChatRoom?.isPrivate && showPendingRequests" class="pending-requests-section ion-padding-horizontal" @slideDown>
                <h4 class="requests-title">Pending Access Requests</h4>
                <ion-list lines="full" *ngIf="(pendingRequests$ | async) as requests; else loadingRequestsOrEmpty">
                     <div *ngIf="requests.length === 0" class="no-requests-message ion-text-center ion-padding-vertical">
                        <p>No pending requests.</p>
                    </div>
                    <ion-item *ngFor="let request of requests; trackBy: trackByRequestId" class="request-item">
                        <ion-avatar slot="start">
                            <img [src]="request.requestingUserProfilePic || 'https://ionicframework.com/docs/img/demos/avatar.svg'" alt="User Avatar">
                        </ion-avatar>
                        <ion-label>
                            <h2>{{ request.requestingUserName }}</h2>
                            <p>Requested: {{ request.requestedAt?.toDate() | date:'short' }}</p> <!-- Safe nav -->
                        </ion-label>
                        <ion-buttons slot="end">
                            <ion-button fill="clear" color="success" (click)="acceptRequest(request)" [disabled]="requestProcessing[request.id!]">
                                <ion-spinner *ngIf="requestProcessing[request.id!]" name="dots" color="success"></ion-spinner>
                                <ion-icon *ngIf="!requestProcessing[request.id!]" slot="icon-only" name="checkmark-outline"></ion-icon>
                            </ion-button>
                            <ion-button fill="clear" color="danger" (click)="rejectRequest(request)" [disabled]="requestProcessing[request.id!]">
                                <ion-spinner *ngIf="requestProcessing[request.id!]" name="dots" color="danger"></ion-spinner>
                                <ion-icon *ngIf="!requestProcessing[request.id!]" slot="icon-only" name="close-outline"></ion-icon>
                            </ion-button>
                        </ion-buttons>
                    </ion-item>
                </ion-list>
                <ng-template #loadingRequestsOrEmpty>
                     <!-- Check if length is explicitly 0 after loading, otherwise show spinner -->
                     <div *ngIf="(pendingRequests$ | async)?.length === 0" class="no-requests-message ion-text-center ion-padding-vertical">
                        <p>No pending requests.</p>
                    </div>
                     <div *ngIf="(pendingRequests$ | async) === null" class="loading-requests ion-text-center ion-padding-vertical">
                        <ion-spinner name="crescent" color="primary"></ion-spinner>
                        <p>Loading requests...</p>
                    </div>
                </ng-template>
            </div>
            <!-- END PENDING REQUESTS SECTION -->

          <!-- Chat Window Area -->
          <div *ngIf="selectedChatRoom" class="chat-window-active">

            <!-- Message Loading Indicator -->
            <div *ngIf="messagesLoading" class="loading-indicator ion-padding ion-text-center">
              <ion-spinner name="dots" color="primary"></ion-spinner>
              <p>Loading messages...</p>
            </div>

            <!-- Messages List -->
            <ng-container *ngIf="!messagesLoading && canAccessCurrentRoom()">
              <ion-list lines="none" class="messages-list">
                 <div style="height: 10px;"></div> <!-- Top buffer -->
                <div
                  *ngFor="let message of messages$ | async; let i = index; trackBy: trackByMessageId"
                  class="message-wrapper"
                  [@messageAnimation]
                  [class.message-sent]="message.senderId === currentUser?.uid"
                  [class.message-received]="message.senderId !== currentUser?.uid"
                  [class.show-sender]="shouldShowSender(i, messages$ | async)"
                >
                    <div class="message-bubble">
                      <div class="message-sender" *ngIf="shouldShowSender(i, messages$ | async) && message.senderId !== currentUser?.uid">
                        {{ message.senderName }}
                      </div>
                      <div class="message-content">
                        {{ message.message }}
                      </div>
                      <div class="message-timestamp">
                        {{ message.timestamp?.toDate() | date:'shortTime' }} <!-- Safe navigation -->
                      </div>
                    </div>
                </div>
                 <div style="height: 10px;"></div> <!-- Bottom buffer -->
                 <div #scrollAnchor></div> <!-- Scroll anchor -->
              </ion-list>
             </ng-container>

             <!-- Restricted Access View -->
            <div *ngIf="!messagesLoading && selectedChatRoom && !canAccessCurrentRoom()" class="restricted-state ion-padding ion-text-center">
                <ion-icon name="lock-closed-outline" class="state-icon" color="warning"></ion-icon>
                <h3>Access Restricted</h3>
                <p>This is a private room. Request access to join the conversation.</p>
                <ion-button (click)="requestAccess(selectedChatRoom)" shape="round" *ngIf="!requestSent" [disabled]="accessRequestInProgress">
                   <ion-spinner *ngIf="accessRequestInProgress" name="dots" slot="start"></ion-spinner>
                   <ion-icon *ngIf="!accessRequestInProgress" slot="start" name="person-add-outline"></ion-icon>
                  Request Access
                </ion-button>
                 <p *ngIf="requestSent" class="request-sent-info"><ion-icon name="time-outline"></ion-icon> Access request sent. Waiting for approval.</p>
             </div>
          </div>

           <!-- Initial Empty State (No Room Selected but rooms exist) -->
          <div *ngIf="!selectedChatRoom && !roomsLoading && chatRooms.length > 0" class="empty-state ion-padding ion-text-center">
            <ion-icon name="chatbubbles-outline" class="state-icon" color="primary"></ion-icon>
            <h3>Select a Chat</h3>
            <p>Choose a room from the menu to start chatting.</p>
          </div>

           <!-- Combined Empty State if NO rooms exist -->
           <div *ngIf="!selectedChatRoom && !roomsLoading && chatRooms.length === 0" class="empty-state ion-padding ion-text-center">
              <ion-icon name="chatbubbles-outline" class="state-icon" color="primary"></ion-icon>
              <h3>Welcome to Chat!</h3>
              <p>It looks a bit empty here. Create the first chat room for your business!</p> <!-- Adjusted text -->
               <ion-button shape="round" (click)="createChat()" class="create-first-room-btn">
                 <ion-icon slot="start" name="add-circle-outline"></ion-icon>
                 Create Your First Room
               </ion-button>
          </div>

            <!-- Error Loading State -->
           <div *ngIf="errorLoading" class="error-state ion-padding ion-text-center">
                <ion-icon name="cloud-offline-outline" class="state-icon" color="danger"></ion-icon>
                <h3>Oops!</h3>
                <p>Could not load chat data. Please check your connection and try refreshing.</p>
                <ion-button (click)="retryLoad()" fill="outline" color="primary">
                    Retry
                </ion-button>
            </div>

        </ion-content>

         <!-- Message Input Footer -->
        <ion-footer *ngIf="selectedChatRoom && canAccessCurrentRoom()" class="ion-no-border message-input-footer">
          <ion-toolbar class="message-input-toolbar">
            <ion-item lines="none" class="message-input-item">
              <ion-input
                #messageInputEl
                name="messageInput"
                [(ngModel)]="newMessage"
                placeholder="Type your message"
                (keyup.enter)="sendMessage()"
                (ionInput)="adjustTextarea($event)"
                (ionFocus)="scrollToBottom()"
                type="text"
                [clearInput]="true"
                class="message-input-field"
              ></ion-input>
              <ion-button
                fill="clear"
                slot="end"
                (click)="sendMessage()"
                [disabled]="!newMessage.trim() || sendingMessage"
                class="send-button"
                shape="circle"
              >
                <ion-icon *ngIf="!sendingMessage" slot="icon-only" name="send-outline" [color]="newMessage.trim() ? 'primary' : 'medium'"></ion-icon>
                <ion-spinner *ngIf="sendingMessage" name="dots" color="primary" class="sending-spinner"></ion-spinner>
              </ion-button>
            </ion-item>
          </ion-toolbar>
        </ion-footer>
      </div>
    </ion-split-pane>
  `,
  // --- Styles remain IDENTICAL to the previous version ---
  styles: [`
    :host {
      --primary-color: #2ecc71;
      --primary-color-rgb: 46, 204, 113;
      --primary-contrast: #ffffff;
      --primary-shade: #28b463;
      --primary-tint: #3fe47e;

      --secondary-color: #3498db;
      --medium-color: #889696; /* Softer medium */
      --light-color: #f8f9fa; /* Slightly warmer light */
      --dark-color: #2c3e50;
      --background-color: #ffffff; /* Main page background */

      --ion-color-primary: var(--primary-color);
      --ion-color-primary-rgb: var(--primary-color-rgb);
      --ion-color-primary-contrast: var(--primary-contrast);
      --ion-color-primary-shade: var(--primary-shade);
      --ion-color-primary-tint: var(--primary-tint);

      --ion-color-secondary: var(--secondary-color);
      --ion-color-medium: var(--medium-color);
      --ion-color-light: var(--light-color);
      --ion-background-color: var(--background-color);
      --ion-text-color: var(--dark-color);

      --ion-toolbar-background: var(--background-color);
      --ion-item-background: transparent; /* Allow list/item backgrounds to control */

      --card-radius: 10px;
      --input-radius: 22px;
      --bubble-radius: 16px;
      height: 100%; /* Ensure host takes full height */
    }

    /* Global adjustment for split pane */
    ion-split-pane {
      --side-width: 280px; /* Slightly narrower sidebar */
      --side-max-width: 320px;
    }

    /* Header & Toolbar */
    ion-header ion-toolbar {
       --background: var(--background-color);
      --border-width: 0 0 1px 0; /* Subtle bottom border */
      --border-color: var(--ion-color-step-150, rgba(0, 0, 0, 0.07));
    }
     .chat-header-title {
        font-weight: 600;
        font-size: 1.1em;
        color: var(--dark-color);
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        padding: 0 40px; /* Prevent overlap */
    }

    /* Menu (Sidebar) */
    ion-menu {
      --background: var(--ion-color-light);
      border-right: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.07));
    }
    ion-menu ion-content { --background: var(--ion-color-light); }
    .menu-title {
      font-weight: 600;
      padding-left: 16px;
      color: var(--dark-color);
    }
    .sidebar-controls {
      padding: 8px 8px 4px 8px;
      border-bottom: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.07));
    }
    .new-room-btn {
      --color: var(--ion-color-primary);
      --ripple-color: var(--ion-color-primary);
      font-weight: 500;
      text-transform: none; /* Keep casing */
      font-size: 0.95em;
      margin: 4px 0;
      --justify-content: flex-start;
    }

    /* Room List */
    .room-list { padding: 0; background: var(--ion-color-light); }
    .room-item {
      --padding-start: 12px;
      --inner-padding-end: 12px;
      --background: transparent;
      --background-hover: rgba(var(--primary-color-rgb), 0.04);
      --background-activated: rgba(var(--primary-color-rgb), 0.08);
      --min-height: 60px;
      margin: 2px 8px;
      border-radius: var(--card-radius);
    }
    .room-item.room-selected {
      --background: rgba(var(--primary-color-rgb), 0.1);
       h2 { font-weight: 700; color: var(--primary-shade); }
    }
    .room-avatar {
      min-width: 40px; height: 40px;
      background-color: var(--ion-color-step-100, #e8e8e8);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      margin-right: 12px;
      ion-icon { font-size: 20px; color: var(--medium-color); }
       img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
    }
    .room-avatar.private ion-icon { color: var(--ion-color-warning, #ffc409); }
    .room-name {
      font-weight: 500; color: var(--dark-color);
      margin-bottom: 3px; font-size: 0.95em;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .room-meta {
      font-size: 0.8em; color: var(--medium-color);
      display: flex; align-items: center; gap: 4px;
      ion-icon { font-size: 1.1em; }
    }
     .room-time { font-size: 0.75em; }
     .empty-list {
         ion-icon { font-size: 40px; margin-bottom: 8px; }
         p { color: var(--medium-color); font-size: 0.9em; margin: 0 0 4px 0;}
         margin-top: 20px;
     }

    /* Main Chat Content */
    .chat-content { --background: var(--background-color); }
    .chat-window-active { min-height: 100%; display: flex; flex-direction: column; }
    .messages-list {
       padding: 0px 8px; /* Reduced padding, let bubbles create space */
       flex-grow: 1;
    }

    /* Message Bubbles */
    .message-wrapper {
      display: flex;
      margin-bottom: 2px; /* Minimal space between consecutive bubbles */
      padding: 0 5px;
    }
     /* Add margin only if the sender changes or time gap is significant */
    .message-wrapper.show-sender {
        margin-top: 12px;
    }
    .message-bubble {
      max-width: 75%;
      padding: 7px 12px;
      border-radius: var(--bubble-radius);
      position: relative;
      box-shadow: 0 1px 1.5px rgba(0,0,0,0.08);
      word-wrap: break-word; /* Ensure long words break */
      overflow-wrap: break-word; /* Alternative */
      hyphens: auto; /* Help break long words */
      font-size: 0.95em; /* Slightly smaller text */
    }
    .message-sent {
      justify-content: flex-end;
      .message-bubble {
        background: var(--primary-gradient, linear-gradient(135deg, var(--primary-tint) 0%, var(--primary-color) 100%));
        color: var(--primary-contrast);
        border-bottom-right-radius: 4px; /* Tail */
      }
      .message-timestamp { color: rgba(255, 255, 255, 0.75); }
    }
    .message-received {
      justify-content: flex-start;
      .message-bubble {
         background: var(--ion-color-light);
         color: var(--dark-color);
         border-bottom-left-radius: 4px; /* Tail */
      }
      .message-timestamp { color: var(--medium-color); }
    }
    .message-sender {
      font-size: 0.75em;
      font-weight: 600;
      margin-bottom: 3px;
      color: var(--secondary-color); /* Use a secondary color for sender */
      display: block;
    }
    .message-content { white-space: pre-wrap; } /* Preserve line breaks */
    .message-timestamp {
      font-size: 0.68em;
      margin-top: 4px;
      text-align: right;
      display: block;
    }

    /* Footer Input Area */
     .message-input-footer {
       background: var(--ion-color-light);
       box-shadow: 0 -2px 5px rgba(0,0,0,0.05); /* Subtle top shadow */
     }
    .message-input-toolbar {
       --background: var(--ion-color-light);
       padding: 5px 8px; /* Consistent padding */
       --min-height: auto; /* Allow toolbar to size naturally */
    }
    .message-input-item {
      --background: #ffffff;
      --padding-start: 8px; /* Less internal padding */
      --inner-padding-end: 4px;
      border-radius: var(--input-radius);
      box-shadow: 0 1px 3px rgba(0,0,0,0.06);
      display: flex;
      align-items: center;
       min-height: 44px; /* Ensure decent height */
    }
    .message-input-field {
       --padding-start: 8px;
       --padding-end: 8px;
       --padding-top: 10px;
       --padding-bottom: 10px;
       margin-right: 4px;
       font-size: 1em;
       max-height: 100px; /* Limit input growth */
       overflow-y: auto; /* Allow scrolling if it grows large */
       transition: height 0.1s ease-out; /* Smooth height change */
       align-self: center; /* Align input field vertically */
    }
    .send-button {
       --padding-start: 0; --padding-end: 0;
       width: 40px; height: 40px;
       margin-left: 4px;
       align-self: center; /* Align button vertically */
       position: relative; /* For spinner */
    }
    .send-button ion-icon { font-size: 22px; }
     .sending-spinner {
       position: absolute; top: 50%; left: 50%;
       transform: translate(-50%, -50%);
       width: 20px; height: 20px; /* Smaller spinner */
     }

    /* Empty/Restricted/Loading States */
    .empty-state, .restricted-state, .loading-indicator, .error-state { /* Added error state */
      display: flex; flex-direction: column;
      align-items: center; justify-content: center;
      flex-grow: 1; /* Take remaining space */
      height: 100%; /* Ensure full height within content */
      padding: 32px; text-align: center;
    }
    .state-icon { font-size: 56px; margin-bottom: 16px; opacity: 0.6; }
    .empty-state h3, .restricted-state h3, .loading-indicator h3, .error-state h3 { font-weight: 600; color: var(--dark-color); margin: 0 0 8px 0; font-size: 1.2em; }
    .empty-state p, .restricted-state p, .loading-indicator p, .error-state p { color: var(--medium-color); max-width: 300px; line-height: 1.5; font-size: 0.95em; }
    .loading-indicator p { margin-top: 8px; }
     .restricted-state ion-button, .create-first-room-btn, .error-state ion-button {
         --background: var(--primary-gradient, linear-gradient(135deg, var(--primary-tint) 0%, var(--primary-color) 100%));
         margin-top: 16px;
         font-weight: 500;
     }
     .request-sent-info {
        display: flex; align-items: center; justify-content: center;
        color: var(--medium-color); margin-top: 16px; font-size: 0.9em;
        ion-icon { margin-right: 4px; font-size: 1.2em; }
     }

     /* Access Requests Section Styles */
    .requests-toggle-btn {
        position: relative; /* Needed for badge positioning */
    }
    .requests-badge {
        position: absolute;
        top: 4px;
        right: 2px;
        font-size: 0.65em;
        --padding-start: 4px;
        --padding-end: 4px;
        min-width: 16px;
        height: 16px;
        line-height: 1; /* Adjust line height for badge */
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .pending-requests-section {
        background-color: var(--ion-color-step-50, #f9f9f9); /* Slightly different background */
        border-bottom: 1px solid var(--ion-color-step-150, rgba(0,0,0,0.07));
        /* Animation applied via Angular Animations */
        overflow: hidden; /* Needed for animation */
    }
    .requests-title {
        font-size: 0.9em;
        font-weight: 600;
        color: var(--ion-color-medium-shade);
        margin: 8px 0 4px 0;
        padding-left: 6px; /* Align slightly with list items */
    }
    .request-item { --min-height: 65px; }
    .request-item ion-avatar img { border-radius: 50%; }
    .request-item ion-label h2 { font-size: 0.9em; font-weight: 500; }
    .request-item ion-label p { font-size: 0.75em; color: var(--ion-color-medium); }
    .request-item ion-buttons ion-button {
        --padding-start: 6px; --padding-end: 6px;
        height: 30px; /* Smaller buttons */
        margin: 0 2px;
    }
    .request-item ion-buttons ion-spinner { width: 18px; height: 18px; }
    .no-requests-message p, .loading-requests p {
        color: var(--ion-color-medium);
        font-size: 0.9em;
        margin: 0;
    }

    /* Utility */
    ion-ripple-effect { color: rgba(var(--primary-color-rgb), 0.1); }
    [scrollAnchor] { height: 1px; } /* Needs to exist */

    /* Animations */
    @keyframes fadeInUp { /* Corrected name */
         from {
            opacity: 0;
            transform: translate3d(0, 20px, 0);
        }
        to {
            opacity: 1;
            transform: translate3d(0, 0, 0);
        }
      }
    /* Message Animation handled by Angular */

  `],
  animations: [
    trigger('messageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(10px) scale(0.98)' }),
        animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0) scale(1)' })),
      ])
    ]),
    trigger('slideDown', [ // Animation for requests section
      transition(':enter', [
        style({ height: '0px', opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1, transform: 'translateY(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ height: '0px', opacity: 0, transform: 'translateY(-10px)' }))
      ])
    ])
  ],
  standalone: true,
  // Ensure ALL Ionic components used in the template are listed here for standalone
  imports: [
    CommonModule, FormsModule, DatePipe, // Angular Core
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent, // Ionic Base
    IonButton, IonList, IonInput, IonItem, IonIcon, IonLabel, IonAvatar, // Ionic Components
    IonSplitPane, IonMenu, IonMenuToggle, IonFooter, IonSpinner // Ionic Layout & Indicators, IonBadge, // Ionic UX & Extras
    // IonListHeader, // Add if you use it
    , IonRefresher, IonRefresherContent // Added
  ]
})
export class GroupChatComponent implements OnInit, OnDestroy {
  // --- Element References (remain the same) ---
  @ViewChild('scrollAnchor', { static: false }) private scrollAnchor!: ElementRef;
  @ViewChild('chatContent', { static: false }) private chatContent!: IonContent;
  @ViewChild('messageInputEl', { static: false }) private messageInputEl!: IonInput;

  // --- Injected Services (remain the same, assume they are correctly provided) ---
  private chatService = inject(ChatService); // Now tenant-aware
  private authService = inject(AuthService); // The source of tenant context
  private router = inject(Router);
  private toastCtrl = inject(ToastController);
  private alertCtrl = inject(AlertController);
  private menuCtrl = inject(MenuController);
  private cdr = inject(ChangeDetectorRef);
  private usersService = inject(UsersService); // *** NOTE: May need adaptation ***

  // --- Component State (mostly the same, but reflects tenant data) ---
  currentUser: UserMetadata | null = null; // Use UserMetadata type from AuthService
  isadmin: boolean = false; // Role check based on metadata

  // Chat Room State
  chatRooms: ChatRoom[] = []; // Will only contain rooms for the current tenant
  selectedChatRoom: ChatRoom | null = null;
  isRoomCreator = false;
  roomsLoading = true;
  errorLoading = false; // Added error state
  private roomsUnsubscribe: (() => void) | null = null;

  // Message State
  messages$: Observable<ChatMessage[]> = of([]); // Will only contain messages for the selected room in the current tenant
  newMessage: string = '';
  messagesLoading = false;
  sendingMessage = false;
  private messageSubscription: Subscription | null = null;
  private firstMessageLoad = true;

  // Access Request State (Requester side)
  requestSent = false;
  accessRequestInProgress = false;

  // Access Request State (Creator side)
  pendingRequests$ = new BehaviorSubject<AccessRequest[] | null>(null);
  requestProcessing: { [requestId: string]: boolean } = {};
  showPendingRequests = false;
  hasPendingRequests = false;
  private pendingRequestsSubscription: Subscription | null = null;

  // Navigation State
  canGoBack = this.router.getCurrentNavigation()?.previousNavigation;

  private subscriptions = new Subscription(); // Central subscription management

  // --- Lifecycle Hooks (remain the same) ---
  ngOnInit() {
    console.log('GroupChatComponent OnInit');
    this.subscribeToUser(); // This will now trigger tenant-aware listeners
    this.subscribeToRouterEvents();
    this.subscribeToPendingRequestsCount();
  }

  ngOnDestroy() {
    console.log('GroupChatComponent OnDestroy');
    this.subscriptions.unsubscribe();
    // Service listeners are now managed internally by the service's OnDestroy
    // But component-level subs for messages/requests still need cleanup
    this.messageSubscription?.unsubscribe();
    this.pendingRequestsSubscription?.unsubscribe();
    // No need to call this.roomsUnsubscribe() here, service handles its listener lifecycle
    console.log('Component subscriptions cleaned up.');
  }

  // --- Data Loading & Subscriptions ---

  private subscribeToUser() {
    const userSub = this.authService.userMetadata$.pipe( // Use userMetadata$ which includes businessId
      distinctUntilChanged((prev, curr) => prev?.uid === curr?.uid && prev?.businessId === curr?.businessId) // React to user *and* business change
    ).subscribe(userMeta => {
      const wasLoggedIn = !!this.currentUser;
      const isLoggedIn = !!userMeta;

      console.log('User Metadata State Change:', userMeta?.uid, 'Business:', userMeta?.businessId);
      this.currentUser = userMeta; // Store the metadata including businessId and role
      this.isadmin = userMeta?.role === 'admin'; // Example role check using metadata

      if (isLoggedIn && userMeta?.businessId) { // Check for businessId as well
        // ChatService listeners are handled automatically by its internal subscription to userMetadata$
        // We just need to subscribe to the results from the service's BehaviorSubject
        this.subscribeToTenantChatRooms();

        // Re-evaluate state if a room was previously selected
        if (this.selectedChatRoom) {
          this.reEvaluateSelectedRoomState();
        }
      } else {
        // Handle user logout or invalid metadata (no businessId)
        if (wasLoggedIn) {
          console.log("User logged out or business context lost, resetting chat state.");
          this.resetChatState(); // Reset component state
        }
        this.roomsLoading = false; // Ensure loading stops
        this.errorLoading = false; // Clear error
      }
      this.cdr.detectChanges(); // Update UI
    });
    this.subscriptions.add(userSub);
  }

  // Separate subscription to the service's room stream
  private subscribeToTenantChatRooms() {
    console.log("Subscribing to ChatService.chatRooms$");
    this.roomsLoading = true; // Set loading when starting subscription
    this.errorLoading = false;
    this.cdr.detectChanges();

    const roomsSub = this.chatService.chatRooms$.subscribe({
      next: (rooms) => {
        console.log('Chat Rooms updated from ChatService:', rooms.length);
        this.chatRooms = rooms; // Update local array
        this.roomsLoading = false; // Stop loading
        this.errorLoading = false; // Clear error on success

        // Update selected room data if necessary
        if (this.selectedChatRoom) {
          this.reEvaluateSelectedRoomState();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error in chatRooms$ subscription:', err);
        this.roomsLoading = false;
        this.errorLoading = true; // Set error flag
        this.showToast('Failed to load chat rooms.', 'danger');
        this.chatRooms = []; // Clear rooms on error
        this.deselectChatRoom();
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.add(roomsSub); // Add to central management for cleanup
  }

  // Re-evaluates state related to the selected room after user or room list changes
  private reEvaluateSelectedRoomState() {
    if (!this.selectedChatRoom || !this.currentUser) return;

    const updatedSelected = this.chatRooms.find(r => r.id === this.selectedChatRoom!.id);
    if (updatedSelected) {
      // Update local copy if needed (e.g., participant list changed)
      if (JSON.stringify(this.selectedChatRoom) !== JSON.stringify(updatedSelected)) {
        console.log("Selected room data updated:", updatedSelected.id);
        this.selectedChatRoom = updatedSelected;
      }
      // Re-check creator status and access rights
      this.isRoomCreator = updatedSelected.createdBy === this.currentUser.uid;
      if (this.isRoomCreator && updatedSelected.isPrivate) {
        this.loadPendingRequestsForRoom(updatedSelected.id!); // Reload requests
      } else {
        this.pendingRequests$.next([]);
        this.pendingRequestsSubscription?.unsubscribe();
      }
      // If access is lost, clear messages and check for existing request
      if (!this.canAccessCurrentRoom()) {
        console.log('Lost access to selected room:', updatedSelected.id);
        this.messages$ = of([]);
        this.checkExistingRequest(updatedSelected.id!);
      }
      // If access is gained (e.g., request approved), load messages
      else if (this.messageSubscription?.closed) { // check if not already loading/subscribed
        this.loadMessagesForRoom(updatedSelected.id!);
      }
    } else {
      console.log("Previously selected room no longer available, deselecting.");
      this.deselectChatRoom(); // Room deleted or user lost access/visibility
    }
    this.cdr.detectChanges();
  }


  // --- Other methods (selectChatRoom, deselectChatRoom, loadMessagesForRoom, sendMessage, Access Control, Request Handling, Room Management, Navigation, UI Utilities, Scrolling, State Reset, TrackBy) ---
  // remain LARGELY THE SAME as they interact with the service's API, which now handles the tenant scoping.

  // --- Key adjustments/verifications in existing methods ---

  selectChatRoom(room: ChatRoom) {
    // No changes needed here - it calls tenant-aware service methods
    if (this.selectedChatRoom?.id === room.id || !this.currentUser) return;
    console.log('Selecting Room:', room.id, room.name);
    this.firstMessageLoad = true;
    this.selectedChatRoom = { ...room }; // Use spread to avoid mutation issues if needed
    this.messages$ = of([]);
    this.requestSent = false;
    this.accessRequestInProgress = false;
    this.isRoomCreator = room.createdBy === this.currentUser?.uid;
    this.showPendingRequests = false;
    this.pendingRequests$.next(null);
    this.pendingRequestsSubscription?.unsubscribe();
    this.pendingRequestsSubscription = null;
    this.messageSubscription?.unsubscribe(); // Ensure previous message sub is cleaned
    this.messageSubscription = null;

    if (this.canAccessCurrentRoom()) {
      this.messagesLoading = true;
      this.cdr.detectChanges();
      this.loadMessagesForRoom(room.id!); // Service method is tenant-aware
    } else {
      this.messagesLoading = false;
      this.checkExistingRequest(room.id!); // Service method needs to be tenant-aware
    }

    if (this.isRoomCreator && room.isPrivate) {
      this.loadPendingRequestsForRoom(room.id!); // Service method is tenant-aware
    } else {
      this.pendingRequests$.next([]);
    }

    this.menuCtrl.isOpen().then(isOpen => {
      if (isOpen && this.isSmallScreen()) this.menuCtrl.close();
    });
    this.cdr.detectChanges();
  }

  loadMessagesForRoom(roomId: string) {
    // No changes needed - calls tenant-aware service method
    if (!this.messagesLoading) {
      this.messagesLoading = true;
      this.cdr.detectChanges();
    }
    this.messageSubscription?.unsubscribe();
    this.messageSubscription = this.chatService.getChatRoomMessages(roomId).pipe(
      tap(async (messages) => {
        // Rest of tap logic remains the same...
        if (!this.selectedChatRoom || this.selectedChatRoom.id !== roomId) return;
        console.log(`Messages updated for ${roomId}:`, messages.length);
        const isCurrentlyAtBottom = await this.isScrolledToBottom();
        const shouldScroll = this.firstMessageLoad || isCurrentlyAtBottom;
        this.messages$ = of(messages); // Update the observable
        if (this.messagesLoading) this.messagesLoading = false;
        this.cdr.detectChanges();
        if (shouldScroll) this.scrollToBottom(this.firstMessageLoad ? 'auto' : 'smooth');
        this.firstMessageLoad = false;
      }),
      finalize(() => { // Ensure loading is turned off
        if (this.messagesLoading && this.selectedChatRoom?.id === roomId) {
          this.messagesLoading = false;
          this.cdr.detectChanges();
        }
      }),
      catchError(err => { // Added catchError for message loading
        if (this.selectedChatRoom?.id === roomId) {
          console.error(`Error loading messages for room ${roomId}:`, err);
          this.showToast('Failed to load messages.', 'danger');
          this.messagesLoading = false;
          this.messages$ = of([]);
          this.firstMessageLoad = false;
          this.errorLoading = true; // Set error flag
          this.cdr.detectChanges();
        }
        return of([]); // Return empty array to keep stream alive if needed
      })
    ).subscribe(); // Subscribe directly (no need for central sub if managed here)
  }

  async sendMessage() {
    // No changes needed - prepares data and calls tenant-aware service method
    const messageText = this.newMessage.trim();
    if (!messageText || !this.selectedChatRoom || !this.canAccessCurrentRoom() || this.sendingMessage || !this.currentUser) return;
    this.sendingMessage = true;
    this.cdr.detectChanges();
    const message: Omit<ChatMessage, 'id'> = {
      senderId: this.currentUser.uid,
      senderName: this.currentUser.displayName || this.currentUser.email || 'Anonymous',
      message: messageText,
      timestamp: Timestamp.now(), // Use Firestore Timestamp
      chatRoomId: this.selectedChatRoom.id!
    };
    const tempNewMessage = this.newMessage;
    this.newMessage = '';
    this.adjustTextarea();
    try {
      await this.chatService.sendMessage(message); // Service is tenant-aware
    } catch (error) {
      console.error('Error sending message:', error);
      this.showToast('Failed to send message.', 'danger');
      this.newMessage = tempNewMessage;
      this.adjustTextarea();
    } finally {
      this.sendingMessage = false;
      this.cdr.detectChanges();
    }
  }

  // ADD: Service method call for checking existing request
  private async checkExistingRequest(roomId: string) {
    if (!this.currentUser?.uid || !roomId) return;
    console.log(`Checking existing request for room ${roomId}, user ${this.currentUser.uid}`);
    this.accessRequestInProgress = true;
    this.requestSent = false;
    this.cdr.detectChanges();

    try {
      // *** USE SERVICE METHOD (You'll need to add this to ChatService) ***
      // Example: Assuming ChatService has `checkExistingPendingRequest`
      // this.requestSent = await this.chatService.checkExistingPendingRequest(roomId, this.currentUser.uid);

      // --- TEMPORARY: Keep direct query until service method is added ---
      const q = query(
        collection(this.chatService['firestore'], `business/${this.currentUser.businessId}/accessRequests`), // Use tenant path
        where('roomId', '==', roomId),
        where('requestingUserId', '==', this.currentUser.uid),
        where('status', '==', 'pending'),
        limit(1)
      );
      const requestSnap = await getDocs(q);
      this.requestSent = !requestSnap.empty;
      // --- END TEMPORARY ---

      console.log(`Existing request found: ${this.requestSent}`);
    } catch (error) {
      console.error("Error checking existing access request:", error);
      this.requestSent = false;
      this.showToast("Error checking request status.", "danger");
    } finally {
      this.accessRequestInProgress = false;
      this.cdr.detectChanges();
    }
  }


  async requestAccess(room: ChatRoom | null) {
    // No changes needed - calls tenant-aware service method
    if (!room || !this.currentUser || !room.id || this.accessRequestInProgress || this.requestSent || !room.isPrivate) return;
    if (!room.createdBy) {
      this.showToast("Cannot send request: Room creator information is missing.", "danger"); return;
    }
    this.accessRequestInProgress = true; this.cdr.detectChanges();
    try {
      await this.chatService.requestAccess( // Service is tenant-aware
        room.id,
        room.name,
        this.currentUser.uid,
        this.currentUser.displayName || this.currentUser.email || 'Unknown User',
        room.createdBy,
        this.currentUser.profilePicture || '' // Optional, if available
      );
      this.showToast('Access request sent!', 'success');
      this.requestSent = true;
    } catch (error: any) {
      console.error('Error requesting access:', error);
      this.showToast(error.message || 'Error sending access request.', 'danger');
      if (error.message?.includes("already sent") || error.message?.includes("already a participant")) { this.requestSent = true; }
      else { this.requestSent = false; }
    } finally {
      this.accessRequestInProgress = false; this.cdr.detectChanges();
    }
  }

  loadPendingRequestsForRoom(roomId: string) {
    // No changes needed - calls tenant-aware service method
    if (!this.isRoomCreator || !roomId) return;
    this.pendingRequestsSubscription?.unsubscribe();
    this.pendingRequests$.next(null);
    console.log(`Subscribing to pending requests for room ${roomId}`);
    this.pendingRequestsSubscription = this.chatService.getPendingRequestsForRoom(roomId) // Service is tenant-aware
      .subscribe({
        next: (requests) => {
          console.log(`Received pending requests for room ${roomId}:`, requests.length);
          this.pendingRequests$.next(requests);
          this.cdr.detectChanges();
        },
        error: (err) => {
          console.error(`Error loading pending requests for room ${roomId}:`, err);
          this.showToast('Failed to load access requests.', 'danger');
          this.pendingRequests$.next([]);
          this.cdr.detectChanges();
        }
      });
  }

  async acceptRequest(request: AccessRequest) {
    // No changes needed - calls tenant-aware service method
    const requestId = request.id;
    if (!requestId || this.requestProcessing[requestId]) return;
    this.requestProcessing[requestId] = true; this.cdr.detectChanges();
    try {
      await this.chatService.approveAccessRequest(requestId, request.roomId, request.requestingUserId); // Service is tenant-aware
      this.showToast(`Accepted ${request.requestingUserName}'s request.`, 'success');
    } catch (error) {
      console.error(`Error accepting request ${requestId}:`, error);
      this.showToast('Failed to accept request.', 'danger');
    } finally {
      this.requestProcessing[requestId] = false;
      if (this.selectedChatRoom && this.selectedChatRoom.id === request.roomId) this.cdr.detectChanges();
    }
  }

  async rejectRequest(request: AccessRequest) {
    // No changes needed - calls tenant-aware service method
    const requestId = request.id;
    if (!requestId || this.requestProcessing[requestId]) return;
    this.requestProcessing[requestId] = true; this.cdr.detectChanges();
    try {
      await this.chatService.rejectAccessRequest(requestId); // Service is tenant-aware
      this.showToast(`Rejected ${request.requestingUserName}'s request.`, 'medium');
    } catch (error) {
      console.error(`Error rejecting request ${requestId}:`, error);
      this.showToast('Failed to reject request.', 'danger');
    } finally {
      this.requestProcessing[requestId] = false;
      if (this.selectedChatRoom && this.selectedChatRoom.id === request.roomId) this.cdr.detectChanges();
    }
  }

  async deleteChatRoom() {
    // No changes needed - calls tenant-aware service method
    if (!this.selectedChatRoom || !this.isRoomCreator || !this.currentUser) return;
    const roomToDelete = { ...this.selectedChatRoom }; // Clone data before deselecting
    console.log(`Attempting to delete room: ${roomToDelete.id} by user ${this.currentUser.uid}`);
    const deletingToast = await this.toastCtrl.create({ message: 'Deleting room...', color: 'medium' });
    await deletingToast.present();
    try {
      this.deselectChatRoom(); // Deselect UI first
      await this.chatService.deleteChatRoom(roomToDelete.id!, this.currentUser.uid); // Service is tenant-aware
      await deletingToast.dismiss();
      this.showToast(`Room "${roomToDelete.name}" deleted.`, 'success');
    } catch (error: any) {
      await deletingToast.dismiss();
      console.error('Error deleting chat room:', error);
      this.showToast(error.message || 'Failed to delete room. Please try again.', 'danger');
    } finally {
      this.cdr.detectChanges();
    }
  }

  navigateBackBasedOnRole() {
    // *** IMPORTANT: Check if UsersService needs adaptation ***
    if (!this.currentUser?.uid) {
      console.warn("Cannot navigate back based on role, no current user.");
      this.router.navigate(['/']); // Default fallback
      return;
    }
    // Assuming UsersService.getUserrole correctly gets the role (potentially from global /users)
    const roleSub = this.usersService.getUserrole(this.currentUser.uid).subscribe({
      next: role => {
        if (role === 'admin' || this.currentUser?.role === 'employer_admin') { // Check metadata role too
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.router.navigate(['/employee-dashboard']);
        }
        roleSub.unsubscribe(); // Unsubscribe after getting the role once
      },
      error: err => {
        console.error("Error getting user role for navigation:", err);
        this.router.navigate(['/employee-dashboard']); // Default fallback on error
        roleSub.unsubscribe();
      }
    });
  }

  /** Retries loading the initial chat rooms list. */
  retryLoad() {
    console.log("GroupChatComponent: Retrying data load...");
    // Re-subscribe or trigger re-fetch if needed.
    // The easiest way is usually to rely on the auth state change
    // triggering the service listener again. For an explicit retry,
    // you might need a method in the service to force-refresh its listener.
    // For now, just reset flags and rely on existing mechanisms.
    this.errorLoading = false;
    this.roomsLoading = true;
    this.cdr.detectChanges();
    // The authService.userMetadata$ subscription in subscribeToUser should re-trigger
    // list fetch if the user is still logged in.
  }

  handleRefresh(event: any) {
    console.log("GroupChatComponent: Refresh triggered.");
    // Since we use realtime listeners, data should be up-to-date.
    // We can just complete the refresher quickly.
    setTimeout(() => {
      event.target.complete();
      this.showToast('Chats are up to date', 'success', 1500);
    }, 500);
    // If you *really* needed to force a data pull (e.g., if not using realtime),
    // you'd call a specific refresh method in your service here.
  }

  // --- Other methods (createChat, presentDeleteConfirm, shouldShowSender, showToast, showConfirmation, scrolling, resetChatState, TrackBy) ---
  // remain IDENTICAL to the previous version. They handle UI, navigation, or basic logic not dependent on tenant context directly.





  // Removed empty ngAfterViewChecked method
  // ngAfterViewChecked() {
  //   // Generally avoid heavy logic here. Scrolling is handled within message loading.
  // }

  // --- Data Loading & Subscriptions ---


  private subscribeToRouterEvents() {
    const routerSub = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.canGoBack = this.router.getCurrentNavigation()?.previousNavigation; // Update back button state
      if (!this.router.url.includes('/group-chat')) {
        this.menuCtrl.isOpen().then(isOpen => {
          if (isOpen) this.menuCtrl.close();
        });
      }
    });
    this.subscriptions.add(routerSub);
  }

  // Subscribe to pending requests to update the 'hasPendingRequests' flag
  private subscribeToPendingRequestsCount() {
    const sub = this.pendingRequests$.subscribe(requests => {
      const newHasPending = !!requests && requests.length > 0;
      if (this.hasPendingRequests !== newHasPending) {
        this.hasPendingRequests = newHasPending;
        console.log('HasPendingRequests changed:', this.hasPendingRequests);
        this.cdr.detectChanges(); // Update view for badge/button state
      }
    });
    this.subscriptions.add(sub);
  }


  listenToChatRooms() {
    if (!this.currentUser?.uid) {
      console.warn("Cannot listen to chat rooms without a user.");
      return;
    }
    if (this.roomsUnsubscribe) {
      console.log("Already listening to chat rooms.");
      return; // Avoid multiple listeners
    }

    console.log("Starting chat room listener...");
    this.roomsLoading = true;
    this.cdr.detectChanges();

    // Use the listener from the service which returns an unsubscribe function
    this.roomsUnsubscribe = this.chatService.listenToAllChatRooms();

    // Subscribe to the BehaviorSubject provided by the service
    const roomsSub = this.chatService.chatRooms$.subscribe({
      next: (rooms) => {
        console.log('Chat Rooms updated from BehaviorSubject:', rooms.length);
        // Sort: Public first, then private, then by name
        this.chatRooms = rooms


        this.roomsLoading = false;

        // Update selected room data if it still exists in the filtered list
        if (this.selectedChatRoom) {
          const updatedSelected = this.chatRooms.find(r => r.id === this.selectedChatRoom!.id);
          if (updatedSelected) {
            // Only update if fundamentally changed, avoid unnecessary re-renders
            if (JSON.stringify(this.selectedChatRoom) !== JSON.stringify(updatedSelected)) {
              console.log("Selected room data updated:", updatedSelected.id);
              this.selectedChatRoom = updatedSelected;
              this.isRoomCreator = updatedSelected.createdBy === this.currentUser?.uid;
              // Reload requests if participant list might have changed externally and user is creator
              if (this.isRoomCreator && updatedSelected.isPrivate) {
                this.loadPendingRequestsForRoom(updatedSelected.id!);
              }
              // Re-check access crucial if participants changed
              if (!this.canAccessCurrentRoom()) {
                console.log('Lost access to selected room:', updatedSelected.id);
                this.messages$ = of([]); // Clear messages
                this.checkExistingRequest(updatedSelected.id!); // Check if request is now needed/pending
              }
            }
          } else {
            console.log("Selected room no longer available/visible, deselecting.");
            this.deselectChatRoom(); // Selected room was deleted or filtered out
          }
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error in chatRooms$ subscription:', err);
        this.roomsLoading = false;
        this.showToast('Failed to load chat rooms.', 'danger');
        this.chatRooms = []; // Clear rooms on error
        this.deselectChatRoom();
        this.cdr.detectChanges();
      }
    });
    this.subscriptions.add(roomsSub); // Add this subscription to central management
  }

  // --- Room Selection & Deselection ---


  deselectChatRoom() {
    if (!this.selectedChatRoom) return; // No room selected
    console.log('Deselecting Room:', this.selectedChatRoom.id);
    this.selectedChatRoom = null;
    this.messages$ = of([]);
    this.messageSubscription?.unsubscribe();
    this.messageSubscription = null;
    this.pendingRequestsSubscription?.unsubscribe();
    this.pendingRequestsSubscription = null;
    this.pendingRequests$.next([]); // Clear requests
    this.isRoomCreator = false;
    this.requestSent = false;
    this.showPendingRequests = false;
    this.hasPendingRequests = false;
    this.newMessage = '';
    this.messagesLoading = false;
    this.accessRequestInProgress = false;
    this.requestProcessing = {};
    this.cdr.detectChanges();
  }

  // Helper to check screen size for menu closing behavior
  private isSmallScreen(): boolean {
    const splitPane = document.querySelector('ion-split-pane');
    return !splitPane?.classList.contains('split-pane-visible');
  }

  // --- Message Loading & Handling ---




  adjustTextarea(event?: any) {
    // Basic textarea height adjustment - consider a directive for more robustness
    requestAnimationFrame(() => {
      const el = this.messageInputEl;
      if (el) {
        el.getInputElement().then(input => {
          input.style.height = 'auto'; // Reset height
          const scrollHeight = input.scrollHeight;
          // Set new height, respecting max-height from CSS
          input.style.height = `${scrollHeight}px`;
        });
      }
    });
  }


  // --- Access Control & Request Handling ---

  // Use this in the template [disabled] and *ngIf checks
  canAccessCurrentRoom(): boolean {
    return this.canAccessRoom(this.selectedChatRoom);
  }

  // General function to check access for any room
  canAccessRoom(room: ChatRoom | null): boolean {
    if (!this.currentUser || !room) return false;
    // Public rooms always accessible
    if (!room.isPrivate) return true;
    // Private rooms accessible if user is a participant
    return room.participants.includes(this.currentUser.uid);
  }




  // --- Creator Request Management ---



  toggleRequestsSection() {
    this.showPendingRequests = !this.showPendingRequests;
  }





  // --- Room Management (Delete, Create) ---

  async presentDeleteConfirm() {
    if (!this.selectedChatRoom || !this.isRoomCreator) return;

    const alert = await this.alertCtrl.create({
      header: 'Delete Chat Room?',
      message: `Are you sure you want to permanently delete "${this.selectedChatRoom.name}"? All messages and access requests will be lost. This cannot be undone.`,
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Delete Permanently',
          role: 'destructive',
          cssClass: 'alert-button-danger',
          handler: () => this.deleteChatRoom(),
        },
      ],
      cssClass: 'delete-alert' // Add custom class if needed
    });
    await alert.present();
  }


  async createChat() {
    if (await this.menuCtrl.isOpen() && this.isSmallScreen()) {
      await this.menuCtrl.close();
    }
    this.router.navigate(['/create-chat']); // Adjust route if needed
  }

  // --- Navigation ---



  // --- UI Utility Methods ---

  shouldShowSender(currentIndex: number, messages: ChatMessage[] | null): boolean {
    if (!messages || messages.length === 0 || currentIndex === 0) return true;
    const currentMsg = messages[currentIndex];
    const prevMsg = messages[currentIndex - 1];
    if (!currentMsg || !prevMsg) return true; // Should not happen

    // Different sender
    if (currentMsg.senderId !== prevMsg.senderId) return true;

    // Time gap (e.g., > 5 minutes) - ensure timestamps exist
    if (currentMsg.timestamp && prevMsg.timestamp) {
      const timeDiff = currentMsg.timestamp.toMillis() - prevMsg.timestamp.toMillis();
      if (timeDiff > 5 * 60 * 1000) return true;
    }

    return false;
  }

  async showToast(message: string, color: 'primary' | 'secondary' | 'tertiary' | 'success' | 'warning' | 'danger' | 'light' | 'medium' | 'dark' = 'primary', duration: number = 2500) {
    try {
      const toast = await this.toastCtrl.create({
        message: message,
        duration: duration,
        color: color,
        position: 'bottom',
        cssClass: 'chat-toast' // Add custom class if needed
      });
      await toast.present();
    } catch (e) {
      console.error("Error showing toast:", e);
    }
  }

  async showConfirmation(header: string, message: string): Promise<boolean> {
    return new Promise(async (resolve) => {
      try {
        const alert = await this.alertCtrl.create({
          header,
          message,
          buttons: [
            { text: 'Cancel', role: 'cancel', handler: () => resolve(false) },
            { text: 'Confirm', handler: () => resolve(true) }
          ]
        });
        await alert.present();
      } catch (e) {
        console.error("Error showing confirmation:", e);
        resolve(false); // Assume cancel on error
      }
    });
  }

  // --- Scrolling ---

  public scrollToBottom(behavior: 'auto' | 'smooth' = 'smooth'): void {
    // Use timeout/requestAnimationFrame to ensure DOM is ready after updates
    requestAnimationFrame(() => {
      try {
        if (this.scrollAnchor?.nativeElement) {
          // console.log('Scrolling to anchor with behavior:', behavior);
          this.scrollAnchor.nativeElement.scrollIntoView({ behavior: behavior, block: 'end' });
        } else if (this.chatContent) {
          // Fallback using IonContent method (might be less reliable with dynamic content height)
          // console.log('Scrolling to bottom using IonContent with behavior:', behavior);
          // this.chatContent.scrollToBottom(behavior === 'smooth' ? 300 : 0);
        }
      } catch (err) {
        console.error('Scroll to bottom failed:', err);
      }
    });
  }

  private async isScrolledToBottom(): Promise<boolean> {
    if (!this.chatContent) {
      console.warn('isScrolledToBottom called before chatContent is ready.');
      return true; // Assume should scroll if content isn't ready
    }
    try {
      const el = await this.chatContent.getScrollElement();
      if (!el) return true; // Should not happen, but safeguard
      const tolerance = 60; // Pixels threshold - allow slightly more leeway

      // Check if scrollHeight is meaningful and content actually scrolls
      if (el.scrollHeight <= el.clientHeight + 1) { // +1 for rounding issues
        return true; // Content doesn't fill the view or no scrollbar
      }
      // The core check: distance from bottom < tolerance
      return el.scrollHeight - el.scrollTop - el.clientHeight < tolerance;
    } catch (error) {
      console.error('Error checking scroll position:', error);
      return true; // Assume should scroll on error
    }
  }

  // --- State Reset ---
  private resetChatState() {
    console.log("Resetting chat state...");
    this.chatRooms = [];
    this.deselectChatRoom(); // Clears selected room, messages, requests, etc.
    this.roomsLoading = true; // Assume reloading needed if user logs back in
    this.currentUser = null; // Clear user
    this.isadmin = false;
    this.roomsUnsubscribe?.(); // Stop listening to rooms
    this.roomsUnsubscribe = null;
    // Other state flags reset within deselectChatRoom
  }

  // --- TrackBy Functions ---
  trackByRoomId(index: number, room: ChatRoom): string | undefined {
    return room.id;
  }
  trackByMessageId(index: number, message: ChatMessage): string | undefined {
    // Use Firestore ID if available, fallback to timestamp + sender for potential local messages
    return message.id || `${message.timestamp?.toMillis()}-${message.senderId}`;
  }
  trackByRequestId(index: number, request: AccessRequest): string | undefined {
    return request.id;
  }

}
