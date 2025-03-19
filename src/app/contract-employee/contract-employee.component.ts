import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, ViewEncapsulation, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Storage, ref, uploadBytes, getDownloadURL, getBytes } from '@angular/fire/storage';
import { Firestore, updateDoc, doc } from '@angular/fire/firestore';
import SignaturePad from 'signature_pad';

import { Auth } from '@angular/fire/auth';
import { Contract, ContractService } from '../services/contract.service';
import { PDFDocument } from 'pdf-lib';
import { addIcons } from 'ionicons';
import { documentText, briefcase, calendar, cash, time, checkmarkCircle, alertCircle, refreshCircle, close, pencil, person, informationCircle, closeOutline } from 'ionicons/icons';
import { Subscription, BehaviorSubject, combineLatest } from 'rxjs';
import { filter, switchMap, tap } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';
import {
  IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
  IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonIcon, IonCard,
  IonCardContent, IonBadge, IonModal, IonButton, AlertController,
  LoadingController, AnimationController
} from '@ionic/angular/standalone';

addIcons({
  documentText,
  briefcase,
  calendar,
  cash,
  time,
  checkmarkCircle,
  alertCircle,
  refreshCircle,
  close,
  pencil, person, informationCircle
});

@Component({
  selector: 'app-contract-signing',
  imports: [CommonModule,
    FormsModule,
    IonHeader, IonToolbar, IonButtons, IonBackButton, IonTitle, IonContent,
    IonSegment, IonSegmentButton, IonLabel, IonSpinner, IonIcon, IonCard,
    IonCardContent, IonBadge, IonModal, IonButton],

  template: `
    <ion-header class="ion-no-border">
      <ion-toolbar class="contract-gradient">
      <ion-buttons slot="start">
          <ion-back-button defaultHref="/employee-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title class="">My Contracts</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>

      <div class="content-container">
        <ion-segment [(ngModel)]="selectedSegment" (ionChange)="onSegmentChange($event)" mode="ios" color="dark">
          <ion-segment-button value="active">
            <ion-label>Active</ion-label>
          </ion-segment-button>
          <ion-segment-button value="terminated">
            <ion-label>Terminated</ion-label>
          </ion-segment-button>
        </ion-segment>

        <div class="loading-spinner" *ngIf="isLoading">
          <ion-spinner name="circles"></ion-spinner>
          <p>Loading contracts...</p>
        </div>

        <div class="empty-state-container" *ngIf="!isLoading && filteredContracts.length === 0">
          <div class="empty-state">
            <ion-icon name="document-text" class="empty-icon"></ion-icon>
            <h3>No {{ selectedSegment }} contracts</h3>
            <p>Contracts will appear here once they're available.</p>
          </div>
        </div>

        <div class="contract-cards-container" *ngIf="!isLoading && filteredContracts.length > 0">
          <ion-card *ngFor="let contract of filteredContracts" (click)="selectContract(contract)" class="contract-card" button="true">
            <div class="card-header">
              <div class="card-icon">
                <ion-icon name="document-text"></ion-icon>
              </div>
              <div class="card-title">
                <h2>{{ contract.positionName }}</h2>
                <ion-badge [color]="contract.signed ? 'success' : 'warning'">
                  {{ contract.signed ? 'Signed' : 'Pending' }}
                </ion-badge>
              </div>
            </div>
            <ion-card-content>
              <div class="card-info-row">
                <div class="info-item">
                  <ion-icon name="briefcase"></ion-icon>
                  <span>{{ contract.contractType }}</span>
                </div>
                <div class="info-item">
                  <ion-icon name="time"></ion-icon>
                  <span>{{ contract.contractHours }} h/week</span>
                </div>
              </div>
              <div class="card-info-row">
                <div class="info-item">
                  <ion-icon name="calendar"></ion-icon>
                  <span>{{ formatDate(contract.startDate) }} - {{ contract.endDate ? formatDate(contract.endDate) : 'Ongoing' }}</span>
                </div>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>

      <!-- Contract Details Modal -->
      <ion-modal [isOpen]="selectedContract !== null" (didDismiss)="selectedContract = null" [breakpoints]="[0, 0.25, 0.5, 1]" [initialBreakpoint]="1">
        <ng-template>
          <ion-header class="ion-no-border modal-header">
            <ion-toolbar class="contract-gradient">
              <ion-buttons slot="end">
                <ion-button (click)="selectedContract = null" color="light">
                  <ion-icon name="close" slot="icon-only"></ion-icon>
                </ion-button>
              </ion-buttons>
              <ion-title class="ion-text-center title-font">Contract Details</ion-title>
            </ion-toolbar>
          </ion-header>
          <ion-content *ngIf="selectedContract">
            <div class="modal-content">
              <div class="contract-header">
                <div class="contract-avatar">
                  <ion-icon name="briefcase"></ion-icon>
                </div>
                <h1>{{ selectedContract.positionName }}</h1>
                <p class="subtitle">{{ selectedContract.contractType }}</p>
                <div class="contract-status" [ngClass]="{'signed': selectedContract.signed, 'pending': !selectedContract.signed}">
                  <ion-icon [name]="selectedContract.signed ? 'checkmark-circle' : 'alert-circle'"></ion-icon>
                  <span>{{ selectedContract.signed ? 'Signed' : 'Pending Signature' }}</span>
                </div>
              </div>

              <div class="contract-timeline">
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>Start Date</h3>
                    <p>{{ formatDate(selectedContract.startDate) }}</p>
                  </div>
                </div>
                <div class="timeline-line"></div>
                <div class="timeline-item">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <h3>End Date</h3>
                    <p>{{ selectedContract.endDate ? formatDate(selectedContract.endDate) : 'Ongoing' }}</p>
                  </div>
                </div>
              </div>

              <div class="contract-details">
                <h2>Contract Details</h2>

                <div class="detail-section">
                  <div class="detail-item">
                    <div class="detail-icon">
                      <ion-icon name="person"></ion-icon>
                    </div>
                    <div class="detail-content">
                      <h3>Employee</h3>
                      <p>{{ selectedContract.employeeName }}</p>
                    </div>
                  </div>

                  <div class="detail-item">
                    <div class="detail-icon">
                      <ion-icon name="time"></ion-icon>
                    </div>
                    <div class="detail-content">
                      <h3>Hours per Week</h3>
                      <p>{{ selectedContract.contractHours }}</p>
                    </div>
                  </div>

                  <div class="detail-item">
                    <div class="detail-icon">
                      <ion-icon name="cash"></ion-icon>
                    </div>
                    <div class="detail-content">
                      <h3>Salary</h3>
                      <p>{{ selectedContract.salary }}€</p>
                    </div>
                  </div>

                  <div class="detail-item">
                    <div class="detail-icon">
                      <ion-icon name="information-circle"></ion-icon>
                    </div>
                    <div class="detail-content">
                      <h3>Status</h3>
                      <p>{{ selectedContract.status }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div class="signature-section" *ngIf="!selectedContract.signed">
                <h2>Sign Contract</h2>
                <p class="signature-instructions">Please sign below to accept the contract terms</p>

                <div class="signature-canvas-container">
                  <canvas #signatureCanvas></canvas>
                </div>

                <div class="signature-actions">
                  <ion-button (click)="clearSignature()" fill="outline" color="medium" class="clear-button">
                    <ion-icon name="refresh-circle" slot="start"></ion-icon>
                    Clear Signature
                  </ion-button>

                  <ion-button (click)="signContract()" [disabled]="!isSignatureValid()" class="sign-button">
                    <ion-icon name="pencil" slot="start"></ion-icon>
                    Sign Contract
                  </ion-button>
                </div>
              </div>

              <div class="signed-contract-section" *ngIf="selectedContract.signed">
                <ion-button (click)="viewSignedContract()" expand="block" class="view-button">
                  <ion-icon name="document-text" slot="start"></ion-icon>
                  View Signed Contract
                </ion-button>
                <p class="signed-date" *ngIf="selectedContract.signedAt">
                  Signed on {{ formatDate(selectedContract.signedAt) }}
                </p>
              </div>
            </div>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [`
    /* Global Styles */
    :host {
      --theme-gradient: linear-gradient(135deg, #050505 0%, #da7356 100%);
      --theme-primary: #da7356;
      --theme-dark: #050505;
      --text-primary: #333333;
      --text-secondary: #666666;
      --card-bg: #ffffff;
      --success-color: #4caf50;
      --warning-color: #ff9800;
      --border-radius: 12px;
      --card-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
      --transition-time: 0.3s;
    }

    /* Header Styles */
    .contract-gradient {
      --background: linear-gradient(135deg, #050505 0%, #da7356 100%);

      --border-color: transparent;
      --border-style: none;
      --color: white;
    }

    .title-font {color:white;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .header-extension {
      height: 40px;
      background: linear-gradient(135deg, #050505 0%, #da7356 100%);
      margin-bottom: -40px;
      border-bottom-left-radius: 24px;
      border-bottom-right-radius: 24px;
      z-index: -1;
      position: relative;
    }

    /* Loading Spinner */
    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 300px;
    }

    .loading-spinner p {
      margin-top: 16px;
      color: var(--text-secondary);
    }

    /* Content Container */
    .content-container {
      padding: 16px;
      z-index: 1;
      position: relative;
    }

    /* Segment Control */
    ion-segment {
      --background: white;
      border-radius: 12px;
      margin-bottom: 20px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.06);
      padding: 4px;
    }

    ion-segment-button {
      --indicator-color: var(--theme-primary);
      --color-checked: var(--theme-gradient);
      --background-checked: var(--theme-gradient);
      --border-radius: 8px;
      --padding-top: 8px;
      --padding-bottom: 8px;
      font-weight: 500;
      transition: all var(--transition-time) ease;
    }

    /* Empty State */
    .empty-state-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 300px;
    }

    .empty-state {
      text-align: center;
      padding: 30px;
    }

    .empty-icon {
      font-size: 64px;
      color: #e0e0e0;
      margin-bottom: 16px;
    }

    .empty-state h3 {
      font-size: 20px;
      color: var(--text-primary);
      margin-bottom: 8px;
    }

    .empty-state p {
      color: var(--text-secondary);
      font-size: 14px;
    }

    /* Contract Cards */
    .contract-cards-container {
      display: grid;
      gap: 16px;
      grid-template-columns: 1fr;
      margin-top: 16px;
    }

    .contract-card {
      margin: 0;
      border-radius: var(--border-radius);
      box-shadow: var(--card-shadow);
      overflow: hidden;
      transition: transform var(--transition-time) ease, box-shadow var(--transition-time) ease;
    }

    .contract-card:active {
      transform: translateY(-2px) scale(0.99);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.12);
    }

    .card-header {
      display: flex;
      align-items: center;
      padding: 16px;
      background: var(--theme-gradient);
      color: white;
    }

    .card-icon {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
    }

    .card-icon ion-icon {
      font-size: 20px;
    }

    .card-title {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .card-title h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    ion-badge {
      font-weight: 500;
      border-radius: 12px;
      --padding-start: 8px;
      --padding-end: 8px;
      --padding-top: 4px;
      --padding-bottom: 4px;
    }

    .card-info-row {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 8px;
    }

    .info-item {
      display: flex;
      align-items: center;
      font-size: 14px;
      color: var(--text-secondary);
    }

    .info-item ion-icon {
      margin-right: 6px;
      color: var(--theme-primary);
      font-size: 16px;
    }

    /* Modal Styles */
    .modal-header ion-toolbar {
      --padding-top: 16px;
      --padding-bottom: 16px;
      color: white;
    }

    .modal-content {
      padding: 24px 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    /* Contract Header in Modal */
    .contract-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 32px;
      color: var(--text-primary);
    }

    .contract-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background:linear-gradient(135deg, #050505 0%, #da7356 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 16px;
      box-shadow: 0 6px 16px rgba(218, 115, 86, 0.3);
    }

    .contract-avatar ion-icon {
      font-size: 36px;
      color:  white;
    }

    .contract-header h1 {
      font-size: 24px;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: var(--text-primary);
    }

    .subtitle {
      font-size: 16px;
      color: var(--text-secondary);
      margin: 0 0 16px 0;
    }

    .contract-status {
      display: flex;
      align-items: center;
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 14px;
      font-weight: 500;
    }

    .contract-status.signed {
      background-color: rgba(76, 175, 80, 0.1);
      color: var(--success-color);
    }

    .contract-status.pending {
      background-color: rgba(255, 152, 0, 0.1);
      color: var(--warning-color);
    }

    .contract-status ion-icon {
      font-size: 18px;
      margin-right: 6px;
    }

    /* Timeline */
    .contract-timeline {
      display: flex;
      align-items: center;
      padding: 16px;
      background-color: #f9f9f9;
      border-radius: var(--border-radius);
      margin-bottom: 32px;
    }

    .timeline-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      width: 120px;
    }

    .timeline-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--theme-primary);
      margin-bottom: 8px;
    }

    .timeline-line {
      flex: 1;
      height: 3px;
      background: var(--theme-primary);
      position: relative;
      top: -22px;
    }

    .timeline-content h3 {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 4px 0;
    }

    .timeline-content p {
      font-size: 14px;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
    }

    /* Contract Details */
    .contract-details {
      margin-bottom: 32px;
    }

    .contract-details h2 {
      font-size: 20px;
      color: var(--text-primary);
      margin-bottom: 16px;
      font-weight: 600;
    }

    .detail-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      padding: 16px;

      border-radius: var(--border-radius);
    }

    .detail-icon {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      --background: linear-gradient(135deg, #050505 0%, #da7356 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 12px;
      flex-shrink: 0;
    }

    .detail-icon ion-icon {
      font-size: 18px;
    }

    .detail-content h3 {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 0 0 4px 0;
    }

    .detail-content p {
      font-size: 16px;
      font-weight: 600;
      margin: 0;
      color: var(--text-primary);
      word-break: break-word;
    }

    /* Signature Section */
    .signature-section {
      margin-bottom: 32px;
    }

    .signature-section h2 {
      font-size: 20px;
      color: var(--text-primary);
      margin-bottom: 8px;
      font-weight: 600;
    }

    .signature-instructions {
      color: var(--text-secondary);
      font-size: 14px;
      margin-bottom: 16px;
    }

    .signature-canvas-container {
      border: 2px dashed var(--theme-primary);
      border-radius: var(--border-radius);
      overflow: hidden;
      margin-bottom: 16px;
      background-color: white;
    }

    canvas {
      width: 100%;
      height: 200px;
      display: block;
    }

    .signature-actions {
      display: flex;
      gap: 12px;
    }

    .clear-button, .sign-button {
      flex: 1;
    }

    .sign-button {
      --background: linear-gradient(135deg, #050505 0%, #da7356 100%);
      --box-shadow: 0 4px 12px rgba(218, 115, 86, 0.3);
    }

    /* Signed Contract Section */
    .signed-contract-section {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
    }

    .view-button {
      --background: linear-gradient(135deg, #050505 0%, #da7356 100%);
      --box-shadow: 0 4px 12px rgba(218, 115, 86, 0.3);
      width: 100%;
      max-width: 300px;
      margin-bottom: 12px;
    }

    .signed-date {
      font-size: 14px;
      color: var(--text-secondary);
      margin: 8px 0 0 0;
    }

    /* Responsive Adjustments */
    @media (min-width: 768px) {
      .contract-cards-container {
        grid-template-columns: repeat(2, 1fr);
      }

      .detail-section {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 992px) {
      .contract-cards-container {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `]
})
export class UserContractPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('signatureCanvas') signatureCanvas!: ElementRef;
  signaturePad: SignaturePad | undefined;

  selectedContract: Contract | null = null;
  contracts: Contract[] = [];
  filteredContracts: Contract[] = [];
  selectedSegment: string = 'active';
  isLoading: boolean = true;

  // Use BehaviorSubject to track filter changes
  private filterSubject = new BehaviorSubject<string>('active');
  private subscriptions: Subscription[] = [];
  private currentUserId: string | null = null;

  constructor(
    private storage: Storage,
    private firestore: Firestore,
    private auth: Auth,
    private authService: AuthService,
    private contractService: ContractService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private animationController: AnimationController
  ) {
    // Retrieve saved segment preference from localStorage if available
    const savedSegment = localStorage.getItem('contractSegment');
    if (savedSegment) {
      this.selectedSegment = savedSegment;
      this.filterSubject.next(savedSegment);
    }
  }

  ngOnInit() {
    // First, set up the authentication state listener
    const authSub = this.authService.getCurrentUser().pipe(
      tap(user => {
        if (user) {
          this.currentUserId = user.uid;
          console.log('Current user ID:', this.currentUserId);
        } else {
          this.currentUserId = null;
          this.contracts = [];
          this.filteredContracts = [];
        }
      }),
      // Only proceed when we have an authenticated user
      filter(user => !!user)
    ).subscribe();

    this.subscriptions.push(authSub);

    // Set up contracts subscription with filter changes
    const contractsSub = combineLatest([
      this.authService.getCurrentUser().pipe(filter(user => !!user)),
      this.filterSubject
    ]).pipe(
      tap(() => this.isLoading = true),
      switchMap(([user, filter]) => {
        console.log(`Loading contracts for user ${user.uid} with filter: ${filter}`);
        return this.contractService.getContracts();
      })
    ).subscribe({
      next: (contracts) => {
        if (this.currentUserId) {
          // Filter contracts for the current user
          this.contracts = contracts.filter(contract => contract.employeeId === this.currentUserId);
          this.filterContracts();
          this.isLoading = false;
          console.log('Contracts loaded:', this.contracts);
        }
      },
      error: (error) => {
        console.error('Error loading contracts:', error);
        this.isLoading = false;
        this.showAlert('Error', 'Failed to load contracts. Please try again later.');
      }
    });

    this.subscriptions.push(contractsSub);
  }

  ngAfterViewInit() {
    // Signature pad initialization occurs in selectContract
  }

  ngOnDestroy() {
    // Clean up all subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  filterContracts() {
    this.filteredContracts = this.contracts.filter(contract =>
      this.selectedSegment === 'active' ?
        contract.status === 'active' : // Active contracts
        contract.status === 'terminated' // Terminated contracts
    );
    console.log(`Filtered contracts (${this.selectedSegment}):`, this.filteredContracts);
  }

  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    // Save segment preference to localStorage
    localStorage.setItem('contractSegment', this.selectedSegment);
    // Update the filter subject
    this.filterSubject.next(this.selectedSegment);
    this.filterContracts();
  }

  selectContract(contract: Contract) {
    this.selectedContract = contract;
    if (!contract.signed) {
      setTimeout(() => {
        this.initializeSignaturePad();
      }, 300);
    }
  }

  private initializeSignaturePad() {
    if (this.signatureCanvas && this.signatureCanvas.nativeElement) {
      const canvas = this.signatureCanvas.nativeElement;
      const containerWidth = canvas.parentElement.offsetWidth;
      canvas.width = containerWidth - 4;
      canvas.height = 200;

      this.signaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)',
        velocityFilterWeight: 0.7
      });

      this.signaturePad.addEventListener('beginStroke', () => {
        canvas.classList.add('signing');
      });

      this.signaturePad.addEventListener('endStroke', () => {
        canvas.classList.remove('signing');
      });
    }
  }

  clearSignature() {
    if (this.signaturePad) {
      this.signaturePad.clear();
      const animation = this.animationController.create()
        .addElement(this.signatureCanvas.nativeElement)
        .duration(300)
        .fromTo('opacity', '0.5', '1');
      animation.play();
    }
  }

  isSignatureValid(): boolean {
    return this.signaturePad ? !this.signaturePad.isEmpty() : false;
  }

  formatDate(dateString: string | Date): string {
    if (!dateString) return '';
    try {
      // Handle both ISO strings and Date objects
      const date = dateString instanceof Date ? dateString : new Date(dateString);
      return date.toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      return String(dateString);
    }
  }

  async viewSignedContract() {
    if (!this.selectedContract?.signed) {
      this.showAlert('Info', 'This contract is not yet signed.');
      return;
    }

    if (this.selectedContract.contractUrl) {
      const loading = await this.loadingController.create({
        message: 'Loading contract...',
        spinner: 'circles'
      });
      await loading.present();

      try {
        const storagePath = this.getStoragePathFromUrl(this.selectedContract.contractUrl);
        const pdfRef = ref(this.storage, storagePath);
        const downloadUrl = await getDownloadURL(pdfRef);
        window.open(downloadUrl, '_system');
      } catch (error) {
        console.error('Error viewing signed contract:', error);
        this.showAlert('Error', 'Failed to load signed contract. Please try again later.');
      } finally {
        await loading.dismiss();
      }
    } else {
      this.showAlert('Error', 'No signed contract found.');
    }
  }

  private getStoragePathFromUrl(url: string): string {
    try {
      // Extract the storage path from the URL
      const urlObj = new URL(url);
      const path = urlObj.pathname.split('/o/')[1]?.split('?')[0];
      if (!path) throw new Error('Invalid Firebase Storage URL');
      return decodeURIComponent(path);
    } catch (error) {
      console.error('Error parsing storage URL:', error);
      throw new Error('Invalid contract URL');
    }
  }


  async signContract() {
    if (!this.isSignatureValid() || !this.selectedContract) {
      this.showAlert('Signature Required', 'Please provide your signature before signing the contract.');
      return;
    }

    const confirmAlert = await this.alertController.create({
      header: 'Confirm Signature',
      message: 'By signing this contract, you agree to all terms and conditions. This action cannot be undone.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Sign Contract',
          cssClass: 'alert-button-confirm',
          handler: () => this.processSignature()
        }
      ],
      cssClass: 'contract-alert'
    });

    await confirmAlert.present();
  }

  async processSignature() {
    const loading = await this.loadingController.create({
      message: 'Processing your signature...',
      spinner: 'circles'
    });
    await loading.present();

    try {
      const user = this.auth.currentUser;
      if (!user) throw new Error('No authenticated user found');

      const employeeSignatureData = this.signaturePad!.toDataURL('image/png');
      let path: string;
      if (this.selectedContract?.contractUrl) {
        path = this.getStoragePathFromUrl(this.selectedContract.contractUrl);
      } else {
        throw new Error('Contract URL is not defined');
      }
      const pdfRef = ref(this.storage, path);
      const existingPdfBytes = await getBytes(pdfRef);

      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const signatureImageBytes = await this.dataURLtoArrayBuffer(employeeSignatureData);
      const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

      const { height } = firstPage.getSize();
      firstPage.drawImage(signatureImage, {
        x: 400,
        y: 400,
        width: 100,
        height: 120,
      });

      const today = new Date().toLocaleDateString();
      firstPage.drawText(`Date: ${today}`, {
        x: 400,
        y: 400,
        size: 10,
      });

      const modifiedPdfBytes = await pdfDoc.save();
      await uploadBytes(pdfRef, modifiedPdfBytes);

      if (!this.selectedContract?.id) {
        throw new Error('Contract ID is not defined');
      }
      const contractRef = doc(this.firestore, 'contracts', this.selectedContract.id);
      await updateDoc(contractRef, {
        signed: true,
        signedAt: new Date(),
        status: 'active'
      });

      // Update the local selectedContract immediately to update UI
      if (this.selectedContract) {
        this.selectedContract.signed = true;
        this.selectedContract.signedAt = new Date();
        this.selectedContract.status = 'active';
      }

      await loading.dismiss();
      this.showAlert('Success', 'Contract signed successfully!');
    } catch (error) {
      console.error('Error signing contract:', error);
      await loading.dismiss();
      this.showAlert('Error', 'Failed to sign contract: ' + (error as any).message);
    }
  }
  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK'],
      cssClass: 'contract-alert'
    });
    await alert.present();
  }

  private async dataURLtoArrayBuffer(dataURL: string): Promise<Uint8Array> {
    const response = await fetch(dataURL);
    const blob = await response.blob();
    return new Uint8Array(await blob.arrayBuffer());
  }
}
