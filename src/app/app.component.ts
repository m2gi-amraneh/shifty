import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { PushNotifications } from '@capacitor/push-notifications';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  constructor() {
    //this.requestPermissions();
    //this.listenToNotifications();

  }
  async requestPermissions() {
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive === 'granted') {
      PushNotifications.register();
    }
  }
  listenToNotifications() {
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      alert(`New notification: ${notification.title} - ${notification.body}`);
    });
  }
}
