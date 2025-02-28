// firebase-storage.service.ts
import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytesResumable, getDownloadURL } from '@angular/fire/storage';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class FirebaseStorageService {
  constructor(private storage: Storage) { }

  uploadFile(path: string, file: File): Observable<string> {
    const storageRef = ref(this.storage, path);
    const uploadTask = uploadBytesResumable(storageRef, file);

    return new Observable(subscriber => {
      uploadTask.on('state_changed',
        (snapshot) => {
          // Handle progress
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          console.log('Upload is ' + progress + '% done');
        },
        (error) => {
          // Handle errors
          console.error('Upload error:', error);
          subscriber.error(error);
        },
        () => {
          // Handle successful completion
          from(getDownloadURL(uploadTask.snapshot.ref)).subscribe(
            downloadURL => {
              subscriber.next(downloadURL);
              subscriber.complete();
            },
            error => subscriber.error(error)
          );
        }
      );
    });
  }
}

// user-contract.page.ts - Update the file upload method
