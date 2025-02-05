import { Component, inject, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonTextarea,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  ModalController,
} from '@ionic/angular/standalone';
import { Post } from '../models/topic.model';
import { TopicService } from '../services/topic.service';
import { generateId } from '../utils/generate-id';

@Component({
  selector: 'app-create-post',
  standalone: true,
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title> Add Post </ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <form (ngSubmit)="addPost()" [formGroup]="addPostForm">
        <ion-list>
          <ion-item lines="none">
            <ion-input
              formControlName="name"
              label="Name"
              errorText="Name is required"
            ></ion-input>
          </ion-item>
          <ion-item lines="none">
            <ion-textarea
              formControlName="description"
              label="Description"
            ></ion-textarea>
          </ion-item>
        </ion-list>
        <ion-button
          type="submit"
          [disabled]="addPostForm.invalid"
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
    IonTextarea,
    IonContent,
    IonList,
    IonItem,
    IonInput,
    IonButton,
    ReactiveFormsModule,
  ],
})
export class CreatePostModalComponent implements OnInit {
  topicId!: string;
  post!: Post;

  addPostForm!: FormGroup;

  private readonly fb = inject(FormBuilder);
  private readonly topicService = inject(TopicService);
  private readonly modalCtrl = inject(ModalController);

  ngOnInit(): void {
    this.addPostForm = this.fb.nonNullable.group({
      name: [this.post?.name ?? '', Validators.required],
      description: [this.post?.description ?? ''],
    });
  }

  addPost(): void {
    const post: Post = {
      ...this.addPostForm.getRawValue(),
      id: this.post?.id ?? generateId(),
    };
    if (this.post?.id) {
      // edit
      this.topicService.editPost(post, this.topicId);
    } else {
      // create
      this.topicService.addPost(post, this.topicId);
    }
    this.modalCtrl.dismiss();
  }
}
