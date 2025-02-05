import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  collectionData,
  addDoc,
  arrayRemove,
  arrayUnion, // Import arrayRemove here
} from '@angular/fire/firestore';
import { inject } from '@angular/core';
import { Topic, Post, UserRole, Topics } from '../models/topic.model';
import { BehaviorSubject, map, Observable, of, switchMap } from 'rxjs';
import { AuthService } from './auth.service'; // Import AuthService
import { ToastController } from '@ionic/angular';

// Inject Firestore directly
@Injectable({
  providedIn: 'root',
})
export class TopicService {
  private firestore: Firestore = inject(Firestore); // Inject Firestore
  private authService: AuthService = inject(AuthService); // Inject AuthService

  private readonly toastController = inject(ToastController);

  private topics$: BehaviorSubject<Topics> = new BehaviorSubject<Topics>([]);

  constructor() {}

  getAll(): Observable<Topics> {
    return this.topics$.asObservable();
  }

  get(topicId: string): Observable<Topic | null> {
    return this.topics$
      .asObservable()
      .pipe(map((topics) => topics.find((t) => t.id === topicId) ?? null));
  }

  addTopic(topic: Topic): void {
    this.topics$.next([...this.topics$.value, topic]);
    this.presentToast('success', 'Topic successfully created');
  }

  addPost(post: Post, topicId: string): void {
    this.topics$.next(
      this.topics$.value.map((t) =>
        // in case of the topic we want to edit, we add the new post to its posts list
        // else we return the existing topic
        t.id === topicId ? { ...t, posts: [...t.posts, post] } : t
      )
    );
    this.presentToast('success', 'Post successfully created');
  }

  deleteTopic(topic: Topic): void {
    this.topics$.next(this.topics$.value.filter((t) => t.id !== topic.id));
    this.presentToast('success', 'Topic successfully deleted');
  }

  deletePost(post: Post, topicId: string): void {
    this.topics$.next(
      this.topics$.value.map((t) =>
        // in case of the topic we want to edit, we filter its posts list to remove the given post
        // else we return the existing topic
        t.id === topicId
          ? {
              ...t,
              posts: t.posts.filter((p) => p.id !== post.id),
            }
          : t
      )
    );
    this.presentToast('success', 'Post successfully deleted');
  }

  editPost(post: Post, topicId: string): void {
    this.topics$.next(
      this.topics$.value.map((t) =>
        // in case of the topic we want to edit, we iterate over its posts list to edit the given post
        // else we return the existing topic
        t.id === topicId
          ? {
              ...t,
              posts: t.posts.map((p) => (p.id === post.id ? post : p)),
            }
          : t
      )
    );
    this.presentToast('success', 'Post successfully modified');
  }

  private async presentToast(color: 'success' | 'danger', message: string) {
    const toast = await this.toastController.create({
      message,
      color,
      duration: 1500,
      position: 'bottom',
    });

    await toast.present();
  }
}
