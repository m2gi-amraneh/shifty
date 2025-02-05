import { Component, inject } from '@angular/core';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  ModalController,
} from '@ionic/angular/standalone';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TopicService } from 'src/app/services/topic.service';
import { generateId } from 'src/app/utils/generate-id';
import { Topic } from '../models/topic.model';
@Component({
  selector: 'app-create-topic',
  standalone: true,
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title> Add Topic </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <form (ngSubmit)="addTopic()" [formGroup]="addTopicForm">
        <ion-list>
          <ion-item lines="none">
            <ion-input
              formControlName="name"
              label="Name"
              errorText="Name is required"
            ></ion-input>
          </ion-item>
        </ion-list>
        <ion-button
          type="submit"
          [disabled]="addTopicForm.invalid"
          class="submit-button"
          >Validate</ion-button
        >
      </form>
    </ion-content>
  `,
  styles: [
    `
      .submit-button {
        position: fixed;
        bottom: 0;
        width: 100%;
      }
    `,
  ],
  imports: [
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    ReactiveFormsModule,
  ],
})
export class CreateTopicModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly topicService = inject(TopicService);
  private readonly modalCtrl = inject(ModalController);

  addTopicForm = this.fb.nonNullable.group({ name: ['', Validators.required] });

  addTopic(): void {
    const topic: Topic = {
      ...this.addTopicForm.getRawValue(),
      id: generateId(),
      posts: [],
    };
    this.topicService.addTopic(topic);
    this.modalCtrl.dismiss();
  }
}
