import {
  Component,
  Input,
  ViewChild,
  WritableSignal,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ModalController,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItemSliding,
  IonItem,
  IonItemOptions,
  IonItemOption,
  IonLabel,
  IonFab,
  IonFabButton,
  IonIcon,
} from '@ionic/angular/standalone';

import { computedAsync } from '@appstrophe/ngx-computeasync';
import { addIcons } from 'ionicons';
import { addOutline } from 'ionicons/icons';
import { TopicService } from '../services/topic.service';
import { CreatePostModalComponent } from '../components/create-post-modal.component';
import { Post } from '../models/topic.model';

addIcons({ addOutline });

@Component({
  selector: 'app-topic-details',
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>
          {{ topic()?.name }}
        </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">{{ topic()?.name }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-list #list>
        @for (post of topic()?.posts; track post.id) {
        <ion-item-sliding>
          <ion-item-options side="start">
            <ion-item-option (click)="editPost(post)" color="primary"
              >Edit</ion-item-option
            >
          </ion-item-options>

          <ion-item>
            <ion-label>{{ post.name }}</ion-label>
          </ion-item>

          <ion-item-options side="end">
            <ion-item-option (click)="deletePost(post)" color="danger"
              >Delete</ion-item-option
            >
          </ion-item-options>
        </ion-item-sliding>
        } @empty {
        <div class="empty-container">
          <strong>There are no Post yet.</strong>
          <p>You can create one clicking the "+" button below.</p>
        </div>
        }
      </ion-list>
      <ion-fab slot="fixed" vertical="bottom" horizontal="end">
        <ion-fab-button (click)="openAddPostModale()">
          <ion-icon name="add-outline"></ion-icon>
        </ion-fab-button>
      </ion-fab>
    </ion-content>
  `,
  styles: [
    `
      div.empty-container {
        height: calc(100dvh - 72px); // 56px header + 2*8px padding y
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
      }
    `,
  ],
  standalone: true,
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItemSliding,
    IonItem,
    IonItemOptions,
    IonItemOption,
    IonLabel,
    IonFab,
    IonFabButton,
    IonIcon,
    CommonModule,
    FormsModule,
  ],
})
export class TopicDetailsPage {
  private _topicId: WritableSignal<string> = signal('');

  @ViewChild('list') list!: IonList;

  @Input({ required: true })
  set topicId(topicId: string) {
    this._topicId.set(topicId);
  }
  get topicId() {
    return this._topicId();
  }

  private readonly topicService = inject(TopicService);
  private readonly modalCtrl = inject(ModalController);

  topic = computedAsync(() => this.topicService.get(this.topicId));

  async openAddPostModale() {
    const modal = await this.modalCtrl.create({
      component: CreatePostModalComponent,
      componentProps: {
        topicId: this._topicId(),
      },
    });
    modal.present();

    await modal.onWillDismiss();
  }

  async editPost(post: Post) {
    const modal = await this.modalCtrl.create({
      component: CreatePostModalComponent,
      componentProps: {
        topicId: this._topicId(),
        post,
      },
    });
    modal.present();
    this.list.closeSlidingItems();

    await modal.onWillDismiss();
  }

  deletePost(post: Post): void {
    this.topicService.deletePost(post, this._topicId());
  }
}
