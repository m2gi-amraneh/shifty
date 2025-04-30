import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Firestore, doc, getDoc, updateDoc, collection, query, where, getDocs, limit, Timestamp } from '@angular/fire/firestore';
import SignaturePad from 'signature_pad';
import { jsPDF } from 'jspdf';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { Contract, ContractService } from '../../services/contract.service';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { BrowserModule } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import { add, closeCircleOutline, closeOutline, createOutline, documentTextOutline, eyeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { Employee, UsersService } from '../../services/users.service';
import { Position, PositionsService } from '../../services/positions.service';
import { AuthService, UserMetadata } from 'src/app/services/auth.service';
import { ToastController } from '@ionic/angular';
import { catchError, filter, switchMap, tap } from 'rxjs/operators';
addIcons({
  eyeOutline, documentTextOutline, refreshOutline, saveOutline, closeOutline, createOutline, add
});
@Component({
  selector: 'app-admin-contracts',
  standalone: true,
  imports: [CommonModule, IonicModule, FormsModule, ReactiveFormsModule],
  template: `
    <ion-header>
      <ion-toolbar class="admin-gradient">
        <ion-buttons slot="start">
          <ion-back-button color="light" defaultHref="/admin-dashboard"></ion-back-button>
        </ion-buttons>
        <ion-title color="light">Contract Management</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content class="admin-content">
      <div class="container">
        <ion-card class="filter-card">
          <ion-card-content>
            <ion-segment [value]="selectedSegment" (ionChange)="onSegmentChange($event)" mode="ios" color="primary">
              <ion-segment-button value="all">
                <ion-label>All</ion-label>
              </ion-segment-button>
              <ion-segment-button value="pending">
                <ion-label>Pending</ion-label>
              </ion-segment-button>
              <ion-segment-button value="signed">
                <ion-label>Signed</ion-label>
              </ion-segment-button>
              <ion-segment-button value="terminated">
                <ion-label>Terminated</ion-label>
              </ion-segment-button>
            </ion-segment>

            <ion-searchbar
              placeholder="Search by employee name"
              [(ngModel)]="searchTerm"
              (ionInput)="filterContracts()"
              class="ion-margin-top custom-searchbar"
              color="light"
              mode="ios"
            ></ion-searchbar>
          </ion-card-content>
        </ion-card>

        <!-- No contracts message -->
        <ion-card *ngIf="filteredContracts.length === 0" class="empty-card">
          <ion-card-content class="ion-text-center">
            <ion-icon name="document-text-outline" class="empty-icon"></ion-icon>
            <h2>No {{ selectedSegment === 'all' ? '' : selectedSegment }} contracts found</h2>
            <p>Create a new contract to get started</p>
          </ion-card-content>
        </ion-card>

        <!-- Contracts list -->
        <ion-card *ngIf="filteredContracts.length > 0" class="contracts-card">
          <ion-card-content class="ion-no-padding">
            <ion-list lines="full">
              <ion-item *ngFor="let contract of filteredContracts" (click)="selectContract(contract)" detail="true" class="contract-item">
                <ion-avatar slot="start" class="contract-avatar">
                  <div class="avatar-icon">
                    <ion-icon name="document-text-outline"></ion-icon>
                  </div>
                </ion-avatar>
                <ion-label>
                  <h2 class="employee-name">{{ contract.employeeName }}</h2>
                  <p class="contract-details">{{ contract.contractType | titlecase }} | {{ formatDate(contract.startDate) }} -
                    {{ contract.endDate ? formatDate(contract.endDate) : 'Ongoing' }}</p>
                  <p class="position-text">{{ contract.position }}</p>
                </ion-label>
                <ion-badge slot="end" [color]="getBadgeColor(contract)" class="status-badge">
                  {{ getContractStatus(contract) }}
                </ion-badge>
              </ion-item>
            </ion-list>
          </ion-card-content>
        </ion-card>
      </div>

      <!-- Create new contract button -->
      <ion-fab vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button color="secondary" (click)="openContractForm()">
          <ion-icon name="add"></ion-icon>
        </ion-fab-button>
      </ion-fab>

      <!-- Create/Edit Contract Modal -->
      <ion-modal [isOpen]="isContractFormOpen" (didDismiss)="closeContractForm()" [initialBreakpoint]="0.95" [breakpoints]="[0, 0.25, 0.5, 0.75, 0.95]" class="contract-modal">
        <ng-template>
          <ion-header>
            <ion-toolbar class="admin-gradient">
              <ion-buttons slot="start">
                <ion-button color="light" (click)="closeContractForm()">
                  <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
              <ion-title color="light">{{ editingContract ? 'Edit Contract' : 'New Contract' }}</ion-title>
              <ion-buttons slot="end">
                <ion-button color="light" (click)="saveContract()" [disabled]="contractForm.invalid || !isEmployerSignatureValid()">
                  <ion-icon slot="icon-only" name="save-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content class="modal-content">
            <form [formGroup]="contractForm">
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Employee Information</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <!-- Employee selection -->
                  <ion-item>
                    <ion-label position="stacked">Employee <ion-text color="danger">*</ion-text></ion-label>
                    <ion-select formControlName="employeeId" (ionChange)="onEmployeeChange($event)" interface="action-sheet" placeholder="Select employee">
                      <ion-select-option *ngFor="let employee of employees" [value]="employee.id">
                        {{ employee.name }}
                      </ion-select-option>
                    </ion-select>
                    <ion-note slot="error" *ngIf="contractForm.get('employeeId')?.errors?.['required'] &&
                      contractForm.get('employeeId')?.touched">
                      Employee is required
                    </ion-note>
                  </ion-item>

                  <!-- Position -->

                  <!-- Position -->
                  <ion-item>
                    <ion-label position="stacked">Position <ion-text color="danger">*</ion-text></ion-label>
                    <ion-select formControlName="position" interface="action-sheet" placeholder="Select position">
                      <ion-select-option *ngFor="let position of positions" [value]="position.name">
                        {{ position.name }}
                      </ion-select-option>
                    </ion-select>
                    <ion-note slot="error" *ngIf="contractForm.get('position')?.errors?.['required'] &&
                      contractForm.get('position')?.touched">
                      Position is required
                    </ion-note>
                  </ion-item>
                </ion-card-content>
              </ion-card>

              <ion-card>
                <ion-card-header>
                  <ion-card-title>Contract Details</ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  <!-- Contract type -->
                  <ion-item>
                    <ion-label position="stacked">Contract Type <ion-text color="danger">*</ion-text></ion-label>
                    <ion-select formControlName="contractType" interface="popover">
                      <ion-select-option value="full-time">Full-Time</ion-select-option>
                      <ion-select-option value="part-time">Part-Time</ion-select-option>
                      <ion-select-option value="temporary">Temporary</ion-select-option>
                    </ion-select>
                    <ion-note slot="error" *ngIf="contractForm.get('contractType')?.errors?.['required'] &&
                      contractForm.get('contractType')?.touched">
                      Contract type is required
                    </ion-note>
                  </ion-item>

                  <!-- Hours per week -->
                  <ion-item>
                    <ion-label position="stacked">Hours per Week <ion-text color="danger">*</ion-text></ion-label>
                    <ion-input formControlName="contractHours" type="number" min="1" placeholder="Enter working hours"></ion-input>
                    <ion-note slot="error" *ngIf="contractForm.get('contractHours')?.errors?.['required'] &&
                      contractForm.get('contractHours')?.touched">
                      Hours are required
                    </ion-note>
                  </ion-item>

                  <!-- Salary -->
                  <ion-item>
                    <ion-label position="stacked">Salary (€) <ion-text color="danger">*</ion-text></ion-label>
                    <ion-input formControlName="salary" type="number" min="0" placeholder="Enter salary amount"></ion-input>
                    <ion-note slot="error" *ngIf="contractForm.get('salary')?.errors?.['required'] &&
                      contractForm.get('salary')?.touched">
                      Salary is required
                    </ion-note>
                  </ion-item>

                  <!-- Start date -->
                  <ion-item>
                    <ion-label position="stacked">Start Date <ion-text color="danger">*</ion-text></ion-label>
                    <ion-input formControlName="startDate" type="date"></ion-input>
                    <ion-note slot="error" *ngIf="contractForm.get('startDate')?.errors?.['required'] &&
                      contractForm.get('startDate')?.touched">
                      Start date is required
                    </ion-note>
                  </ion-item>

                  <!-- End date (optional) -->
                  <ion-item>
                    <ion-label position="stacked">End Date <ion-text color="medium">(optional for permanent contracts)</ion-text></ion-label>
                    <ion-input formControlName="endDate" type="date"></ion-input>
                  </ion-item>
                </ion-card-content>
              </ion-card>

              <!-- Employer Signature -->
              <ion-card>
                <ion-card-header>
                  <ion-card-title>Employer Signature <ion-text color="danger">*</ion-text></ion-card-title>
                  <ion-card-subtitle>Sign below to authorize this contract</ion-card-subtitle>
                </ion-card-header>
                <ion-card-content>
                  <div class="signature-container">
                    <canvas #employerSignatureCanvas width="300" height="200"></canvas>
                    <div class="signature-buttons">
                      <ion-button type="button" fill="outline" color="medium" (click)="clearEmployerSignature()">
                        <ion-icon name="refresh-outline" slot="start"></ion-icon>
                        Clear
                      </ion-button>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>

              <!-- Form submission -->
              <div class="form-buttons">
                <ion-button type="button" expand="block" (click)="saveContract()" [disabled]="contractForm.invalid || !isEmployerSignatureValid()">
                  <ion-icon name="save-outline" slot="start"></ion-icon>
                  {{ editingContract ? 'Update Contract' : 'Create Contract' }}
                </ion-button>
              </div>
            </form>
          </ion-content>
        </ng-template>
      </ion-modal>

      <!-- Contract Details Modal -->
      <ion-modal [isOpen]="selectedContract !== null" (didDismiss)="selectedContract = null" [initialBreakpoint]="0.75" [breakpoints]="[0, 0.25, 0.5, 0.75, 1]">
        <ng-template>
          <ion-header>
            <ion-toolbar class="admin-gradient">
              <ion-buttons slot="start">
                <ion-button color="light" (click)="selectedContract = null">
                  <ion-icon slot="icon-only" name="close-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
              <ion-title color="light">Contract Details</ion-title>
              <ion-buttons slot="end">
                <ion-button *ngIf="!selectedContract?.signed && selectedContract?.status === 'active'"
                          color="light" (click)="editContract()">
                  <ion-icon slot="icon-only" name="create-outline"></ion-icon>
                </ion-button>
              </ion-buttons>
            </ion-toolbar>
          </ion-header>

          <ion-content class="modal-content" *ngIf="selectedContract">
            <ion-card class="details-card">
              <div class="contract-header">
                <h1>{{ selectedContract.employeeName }}</h1>
                <h3>{{ selectedContract.position }}</h3>
                <ion-badge [color]="getBadgeColor(selectedContract)" class="status-badge-large">
                  {{ getContractStatus(selectedContract) }}
                </ion-badge>
              </div>

              <ion-card-content>
                <div class="contract-section">
                  <h3 class="section-title">Contract Information</h3>
                  <ion-grid>
                    <ion-row>
                      <ion-col size="6">
                        <div class="info-item">
                          <div class="info-label">Contract Type</div>
                          <div class="info-value">{{ selectedContract.contractType | titlecase }}</div>
                        </div>
                      </ion-col>
                      <ion-col size="6">
                        <div class="info-item">
                          <div class="info-label">Hours per Week</div>
                          <div class="info-value">{{ selectedContract.contractHours }}</div>
                        </div>
                      </ion-col>
                    </ion-row>

                    <ion-row>
                      <ion-col size="6">
                        <div class="info-item">
                          <div class="info-label">Start Date</div>
                          <div class="info-value">{{ formatDate(selectedContract.startDate) }}</div>
                        </div>
                      </ion-col>
                      <ion-col size="6">
                        <div class="info-item">
                          <div class="info-label">End Date</div>
                          <div class="info-value">{{ selectedContract.endDate ? formatDate(selectedContract.endDate) : 'Ongoing' }}</div>
                        </div>
                      </ion-col>
                    </ion-row>

                    <ion-row>
                      <ion-col size="6">
                        <div class="info-item">
                          <div class="info-label">Salary</div>
                          <div class="info-value">{{ selectedContract.salary | currency:'EUR':'symbol':'1.0-0' }}</div>
                        </div>
                      </ion-col>
                      <ion-col size="6" *ngIf="selectedContract.signed">
                        <div class="info-item">
                          <div class="info-label">Signed Date</div>
                          <div class="info-value">{{ selectedContract.signedAt ? formatDate(selectedContract.signedAt) : 'Unknown' }}</div>
                        </div>
                      </ion-col>
                    </ion-row>
                  </ion-grid>
                </div>

                <!-- Action buttons -->
                <div class="action-buttons">
                  <ion-button expand="block" class="view-button" (click)="viewContract()" *ngIf="selectedContract.contractUrl">
                    <ion-icon name="document-outline" slot="start"></ion-icon>
                    View Contract Document
                  </ion-button>

                  <div class="button-group" *ngIf="selectedContract.status === 'active'">
                    <ion-button expand="block" color="secondary" fill="outline" (click)="editContract()"
                      *ngIf="!selectedContract.signed && selectedContract.status === 'active'" class="action-button">
                      <ion-icon name="create-outline" slot="start"></ion-icon>
                      Edit Contract
                    </ion-button>

                    <ion-button expand="block" color="danger" fill="outline" (click)="confirmTerminateContract()"
                      *ngIf="selectedContract.status === 'active'" class="action-button">
                      <ion-icon name="close-circle-outline" slot="start"></ion-icon>
                      Terminate Contract
                    </ion-button>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-content>
        </ng-template>
      </ion-modal>
    </ion-content>
  `,
  styles: [`
    /* Main Theme Colors */
    .admin-gradient {
      --background: linear-gradient(135deg, #7b2cbf 0%, #5a189a 100%);
    }

    .admin-content {
      --background: #f4f5fa;
    }

    .container {
      padding: 16px;
    }

    /* Filter Card */
    .filter-card {
      margin-bottom: 16px;
      border-radius: 12px;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .custom-searchbar {
      --border-radius: 8px;
      --box-shadow: none;
      --background: #ffffff;
      margin-top: 16px;
    }

    /* Empty State */
    .empty-card {
      padding: 24px;
      text-align: center;
      border-radius: 12px;
    }

    .empty-icon {
      font-size: 64px;
      color: var(--ion-color-medium);
      margin-bottom: 16px;
    }

    /* Contracts List */
    .contracts-card {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    }

    .contract-item {
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 12px;
      --padding-bottom: 12px;
      --border-color: #eee;
    }

    .contract-avatar {
      --border-radius: 8px;
      width: 48px;
      height: 48px;
    }

    .avatar-icon {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #7b2cbf20;
      color: #7b2cbf;
      font-size: 24px;
    }

    .employee-name {
      font-weight: 600;
      font-size: 16px;
      color: #333;
      margin-bottom: 4px;
    }

    .contract-details {
      font-size: 14px;
      color: #666;
    }

    .position-text {
      font-size: 13px;
      color: #888;
    }

    .status-badge {
      border-radius: 16px;
      padding: 4px 8px;
      font-weight: 500;
      text-transform: uppercase;
      font-size: 10px;
    }

    /* Modal Styles */
    .contract-modal {
      --border-radius: 16px 16px 0 0;
    }

    .modal-content {
      --padding-start: 16px;
      --padding-end: 16px;
      --padding-top: 16px;
      --padding-bottom: 24px;
      --background: #f4f5fa;
    }

    /* Contract Details Modal */
    .details-card {
      border-radius: 12px;
      overflow: hidden;
      margin: 16px 0;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .contract-header {
      background: linear-gradient(135deg, #7b2cbf10 0%, #5a189a10 100%);
      padding: 24px;
      text-align: center;
      border-bottom: 1px solid #eee;
    }

    .contract-header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 700;
      color: #333;
    }

    .contract-header h3 {
      margin: 8px 0 16px;
      font-size: 16px;
      font-weight: 500;
      color: #555;
    }

    .status-badge-large {
      padding: 6px 12px;
      border-radius: 16px;
      text-transform: uppercase;
      font-weight: 500;
      font-size: 12px;
    }

    .contract-section {
      margin-bottom: 24px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      color: #333;
      margin-bottom: 16px;
      padding-bottom: 8px;
      border-bottom: 1px solid #eee;
    }

    .info-item {
      margin-bottom: 12px;
    }

    .info-label {
      font-size: 13px;
      color: #666;
      margin-bottom: 4px;
    }

    .info-value {
      font-size: 16px;
      font-weight: 500;
      color: #333;
    }

    /* Action Buttons */
    .action-buttons {
      margin-top: 24px;
    }

    .view-button {
      margin-bottom: 16px;
      --border-radius: 8px;
    }

    .button-group {
      display: flex;
      gap: 12px;
    }

    .action-button {
      flex: 1;
      --border-radius: 8px;
    }

    /* Signature Pad */
    .signature-container {
      margin: 12px 0;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      overflow: hidden;
    }

    .signature-container canvas {
      width: 100%;
      height: 200px;
      background-color: white;
      display: block;
    }

    .signature-buttons {
      display: flex;
      justify-content: flex-end;
      padding: 8px;
      background-color: #f8f8f8;
    }

    .form-buttons {
      margin-top: 24px;
      margin-bottom: 24px;
    }
  `]
})
export class AdminContractsPage implements OnInit, OnDestroy {
  @ViewChild('employerSignatureCanvas', { static: false }) employerSignatureCanvas!: ElementRef;
  employerSignaturePad: SignaturePad | undefined;

  // State Properties
  selectedContract: Contract | null = null; // For viewing details
  editingContractData: Contract | null = null; // Holds the original contract being edited
  contracts: Contract[] = []; // All contracts for the current business
  filteredContracts: Contract[] = []; // Contracts filtered by segment/search
  selectedSegment: string = 'all'; // 'all', 'pending', 'signed', 'terminated'
  searchTerm: string = '';
  isContractFormOpen: boolean = false;
  editingContract: boolean = false; // Flag: true if editing, false if creating
  isLoading: boolean = true;
  errorLoading: boolean = false;
  employees: Employee[] = []; // Employees for the current business
  positions: Position[] = []; // Positions for the current business
  currentUser: UserMetadata | null = null; // Store current user metadata

  contractForm: FormGroup; // Form group for creating/editing

  private subscriptions = new Subscription(); // Manage all subscriptions

  // Injected Services
  private fb: FormBuilder = inject(FormBuilder);
  private storage: Storage = inject(Storage);
  private firestore: Firestore = inject(Firestore);
  private authService: AuthService = inject(AuthService); // Tenant-aware
  private contractService: ContractService = inject(ContractService); // Tenant-aware
  private positionsService: PositionsService = inject(PositionsService); // Tenant-aware
  private usersService: UsersService = inject(UsersService); // Tenant-aware
  private alertController: AlertController = inject(AlertController);
  private loadingController: LoadingController = inject(LoadingController);
  private modalController: ModalController = inject(ModalController); // If using Ionic Modals for form
  private cdr: ChangeDetectorRef = inject(ChangeDetectorRef); // For manual change detection
  private toastController: ToastController = inject(ToastController); // Added ToastController
  creatingRoom: boolean | undefined;

  constructor() {
    this.contractForm = this.createContractForm();
    // Restore segment preference
    const savedSegment = localStorage.getItem('adminContractSegment');
    if (savedSegment && ['all', 'pending', 'signed', 'terminated'].includes(savedSegment)) {
      this.selectedSegment = savedSegment;
    }
  }

  ngOnInit() {
    console.log("AdminContractsPage: OnInit");
    this.subscribeToAuthAndLoadData();
  }

  ngOnDestroy() {
    console.log("AdminContractsPage: OnDestroy");
    this.subscriptions.unsubscribe(); // Clean up all subscriptions
  }

  /** Subscribe to Auth state and load dependent data */
  private subscribeToAuthAndLoadData() {
    this.isLoading = true;
    this.errorLoading = false;
    this.cdr.detectChanges();

    const authSub = this.authService.userMetadata$.pipe(
      tap(userMeta => {
        this.currentUser = userMeta; // Store current user
        console.log("AdminContractsPage: Current User Meta:", userMeta);
        if (!userMeta || !userMeta.businessId) {
          // Handle logout or missing business context
          this.isLoading = false;
          this.errorLoading = !userMeta; // Error if logged out after init
          this.contracts = [];
          this.filteredContracts = [];
          this.employees = [];
          this.positions = [];
          this.cdr.detectChanges();
        }
      }),
      filter((userMeta): userMeta is UserMetadata => !!userMeta && !!userMeta.uid && !!userMeta.businessId), // Proceed only with valid user and business
      // Once we have user/business context, load everything else
      switchMap(userMeta => {
        console.log(`AdminContractsPage: Loading data for business ${userMeta.businessId}`);
        // Use combineLatest to load contracts, positions, employees concurrently
        return combineLatest([
          this.contractService.getContracts().pipe(catchError(err => { console.error("Error loading contracts", err); return of([]); })), // Service is tenant-aware
          this.positionsService.getPositions().pipe(catchError(err => { console.error("Error loading positions", err); return of([]); })), // Service is tenant-aware
          this.usersService.getEmployees().pipe(catchError(err => { console.error("Error loading employees", err); return of([]); })) // Service is tenant-aware (assuming getEmployees is adapted)
        ]);
      }),
      // Catch errors from combineLatest or upstream
      catchError(error => {
        console.error('Error loading initial data:', error);
        this.isLoading = false;
        this.errorLoading = true;
        this.showToast('Failed to load necessary data.', 'danger');
        this.cdr.detectChanges();
        return of([[], [], []]); // Return empty arrays on error
      })
    ).subscribe(([contracts, positions, employees]) => {
      console.log(`AdminContractsPage: Data received - Contracts: ${contracts.length}, Positions: ${positions.length}, Employees: ${employees.length}`);
      this.contracts = contracts as Contract[]; // Cast needed if service returns 'any[]'
      this.positions = positions as Position[];
      this.employees = employees as Employee[];
      this.filterContracts(); // Apply initial filter
      this.isLoading = false;
      this.errorLoading = false; // Clear error on success
      this.cdr.detectChanges(); // Ensure UI updates
    });

    this.subscriptions.add(authSub);
  }


  /** Creates the initial form group */
  private createContractForm(): FormGroup {
    return this.fb.group({
      // Keep required fields
      employeeId: ['', Validators.required],
      employeeName: [{ value: '', disabled: true }, Validators.required], // Keep disabled, set via selection
      contractType: ['full-time', Validators.required],
      position: ['', Validators.required], // Changed from positionId to store name directly? Or keep ID? Let's store Name based on form
      contractHours: [40, [Validators.required, Validators.min(1)]],
      salary: [0, [Validators.required, Validators.min(0)]],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      // Optional fields
      endDate: [''], // Default to empty string
      // Internal fields (not directly edited by user here)
      // status: ['active'], // Status determined by logic/signing
      // signed: [false],
      // createdAt: [null],
      // updatedAt: [null],
      // terminatedAt: [null],
      // signedAt: [null],
      // contractUrl: ['']
    });
  }


  /** Filter contracts based on segment and search term */
  filterContracts() {
    let filtered = [...this.contracts];

    // Filter by segment
    if (this.selectedSegment !== 'all') {
      if (this.selectedSegment === 'pending') {
        filtered = filtered.filter(c => c.status === 'active' && !c.signed);
      } else if (this.selectedSegment === 'signed') {
        filtered = filtered.filter(c => c.status === 'active' && c.signed);
      } else if (this.selectedSegment === 'terminated') {
        filtered = filtered.filter(c => c.status === 'terminated' || c.status === 'expired');
      }
    }

    // Filter by search term (case-insensitive)
    if (this.searchTerm && this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase().trim();
      filtered = filtered.filter(c =>
        c.employeeName?.toLowerCase().includes(term) ||
        c.position?.toLowerCase().includes(term) || // Search position name if available
        c.positionName?.toLowerCase().includes(term)
      );
    }

    // Optional: Sort results
    this.filteredContracts = filtered.sort((a, b) => {
      try {
        // Sort by start date descending by default
        return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
      } catch { return 0; }
    });
    this.cdr.detectChanges(); // Update view
  }

  /** Handle segment change */
  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    if (['all', 'pending', 'signed', 'terminated'].includes(this.selectedSegment)) {
      localStorage.setItem('adminContractSegment', this.selectedSegment);
    }
    this.filterContracts();
  }

  /** View contract details */
  selectContract(contract: Contract) {
    console.log("AdminContractsPage: Selecting contract for viewing:", contract?.id);
    if (!contract || !contract.id) {
      console.error("AdminContractsPage: Attempted to select an invalid contract object.");
      this.showToast("Could not open contract details.", "danger");
      return;
    }
    this.selectedContract = { ...contract };
    // Force change detection immediately after setting the state
    this.cdr.detectChanges(); // Add this line if absolutely necessary
    console.log("AdminContractsPage: selectedContract state updated and detectChanges called.");
  }

  /** Get display status text */
  getContractStatus(contract: Contract): string {
    if (!contract) return 'Unknown';
    if (contract.status === 'terminated' || contract.status === 'expired') return 'Terminated';
    if (contract.signed) return 'Signed';
    return 'Pending Signature';
  }

  /** Get badge color based on status */
  getBadgeColor(contract: Contract): string {
    if (!contract) return 'medium';
    if (contract.status === 'terminated' || contract.status === 'expired') return 'danger';
    if (contract.signed) return 'success';
    return 'warning'; // Pending
  }

  /** Open the modal/form for creating a new contract */
  async openContractForm() {
    this.editingContract = false;
    this.editingContractData = null;
    this.contractForm.reset({ // Reset with defaults
      contractType: 'full-time',
      contractHours: 40,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active', // Implicitly active when created
      salary: 0,
      employeeId: '',
      employeeName: '',
      position: '',
      endDate: ''
    });
    this.employerSignaturePad?.clear(); // Clear signature pad if exists
    this.isContractFormOpen = true; // Show the modal/form
    // Initialize signature pad after modal is likely visible
    setTimeout(() => { this.initializeEmployerSignaturePad(); }, 150);
  }

  /** Close the contract form modal/view */
  closeContractForm() {
    this.isContractFormOpen = false;
    this.editingContract = false;
    this.editingContractData = null;
    this.employerSignaturePad?.clear();
    this.employerSignaturePad = undefined; // Release pad instance
  }

  /** Pre-fill form for editing an existing contract */
  async editContract() {
    if (!this.selectedContract) return;
    // Prevent editing signed contracts
    if (this.selectedContract.signed) {
      await this.showToast('Signed contracts cannot be edited.', 'warning');
      return;
    }

    this.editingContract = true;
    // Clone the contract data to avoid modifying the original object directly
    this.editingContractData = { ...this.selectedContract };

    this.contractForm.patchValue({
      employeeId: this.editingContractData.employeeId,
      employeeName: this.editingContractData.employeeName,
      contractType: this.editingContractData.contractType,
      position: this.editingContractData.position, // Or positionName if that's what you store/select
      contractHours: this.editingContractData.contractHours,
      salary: this.editingContractData.salary,
      // Format dates for the input type="date"
      startDate: this.formatDateForInput(this.editingContractData.startDate),
      endDate: this.formatDateForInput(this.editingContractData.endDate),
      // status: this.editingContractData.status // Don't usually edit status directly here
    });

    this.isContractFormOpen = true; // Open the form modal
    this.selectedContract = null; // Close the details view if it was open

    // Initialize signature pad after modal is likely visible
    setTimeout(() => { this.initializeEmployerSignaturePad(); }, 150);
  }

  /** Handle employee selection change */
  async onEmployeeChange(event: any) {
    const employeeId = event.detail.value;
    const selectedEmployee = this.employees.find(emp => emp.id === employeeId);

    if (selectedEmployee) {
      // Set employee name (it's disabled, so use patchValue)
      this.contractForm.patchValue({ employeeName: selectedEmployee.name });

      // Check for existing active contract *only if creating a new one*
      if (!this.editingContract) {
        const loading = await this.loadingController.create({ message: 'Checking employee status...' });
        await loading.present();
        try {
          const hasActiveContract = await this.checkEmployeeHasActiveContract(employeeId);
          if (hasActiveContract) {
            this.showAlert('Warning', 'This employee already has an active contract. Terminate the existing one before creating a new contract.');
            this.contractForm.patchValue({ employeeId: '', employeeName: '' }); // Reset selection
          }
        } catch (error) {
          console.error("Error checking active contract:", error);
          this.showToast("Could not verify employee's contract status.", "danger");
        } finally {
          await loading.dismiss();
        }
      }
    } else {
      this.contractForm.patchValue({ employeeName: '' }); // Clear name if employee not found
    }
  }

  /**
   * ADAPTED: Checks if an employee has an active contract WITHIN the current business.
   */
  private async checkEmployeeHasActiveContract(employeeId: string): Promise<boolean> {
    const businessId = this.authService.getCurrentBusinessId(); // Get tenant context
    if (!businessId) {
      console.warn("checkEmployeeHasActiveContract: No business context.");
      // Depending on desired behavior, could throw or return false
      return false;
    }
    if (!employeeId) return false;

    const collectionPath = `business/${businessId}/contracts`; // Tenant-specific path
    console.log(`checkEmployeeHasActiveContract: Querying ${collectionPath}`);
    try {
      const q = query(
        collection(this.firestore, collectionPath),
        where('employeeId', '==', employeeId),
        where('status', '==', 'active'),
        limit(1) // Only need to know if one exists
      );
      const snapshot = await getDocs(q);

      // If editing, ensure we don't count the contract being edited
      if (this.editingContract && this.editingContractData?.id) {
        return snapshot.docs.some(doc => doc.id !== this.editingContractData!.id);
      }
      return !snapshot.empty; // True if any active contract exists (and not editing that one)

    } catch (error) {
      console.error('Error checking for active contracts:', error);
      // Decide how to handle error - maybe rethrow or return false
      return false;
    }
  }

  // --- Signature Pad Methods (No tenant changes needed) ---
  private initializeEmployerSignaturePad() {
    if (this.employerSignatureCanvas && this.employerSignatureCanvas.nativeElement) {
      const canvas = this.employerSignatureCanvas.nativeElement;
      canvas.width = canvas.offsetWidth || 300;
      canvas.height = 200;

      this.employerSignaturePad = new SignaturePad(canvas, {
        backgroundColor: 'rgb(255, 255, 255)',
        penColor: 'rgb(0, 0, 0)'
      });
    } else {
      console.error('Employer signature canvas not found');
    }
  }
  clearEmployerSignature() { /* ... same logic ... */
    if (this.employerSignaturePad) { this.employerSignaturePad.clear(); }
  }
  isEmployerSignatureValid(): boolean { /* ... same logic ... */
    return this.employerSignaturePad?.isEmpty() === false;
  }

  // --- Date Formatting ---
  formatDate(dateInput: string | Date | Timestamp | undefined): string {
    if (!dateInput) return 'N/A';
    try {
      let date: Date;
      if (dateInput instanceof Timestamp) date = dateInput.toDate();
      else if (dateInput instanceof Date) date = dateInput;
      else date = new Date(dateInput);
      if (isNaN(date.getTime())) return 'Invalid Date';
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch (e) { return 'Invalid Date'; }
  }

  formatDateForInput(dateInput: string | Date | Timestamp | undefined | null): string {
    if (!dateInput) return '';
    try {
      let date: Date;
      if (dateInput instanceof Timestamp) date = dateInput.toDate();
      else if (dateInput instanceof Date) date = dateInput;
      else date = new Date(dateInput);
      if (isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
    } catch (e) { return ''; }
  }

  // --- Save/Update Contract ---
  /** ADAPTED: Saves a new or updates an existing contract */
  async saveContract() {
    if (!this.contractForm.valid) { this.showToast('Please fill all required fields.', 'warning'); return; }
    if (!this.isEmployerSignatureValid()) { this.showToast('Employer signature is required.', 'warning'); return; }

    const businessId = this.authService.getCurrentBusinessId(); // Get tenant context
    const currentUser = this.authService.getCurrentAuthUser(); // Get current user for creator ID (optional)

    if (!businessId || !currentUser?.uid) {
      this.showToast('Error: Cannot save contract. Missing user or business context.', 'danger');
      return;
    }

    const loading = await this.loadingController.create({ message: this.editingContract ? 'Updating contract...' : 'Creating contract...' });
    await loading.present();

    try {
      const formData = this.contractForm.value;
      const employerSignatureDataUrl = this.employerSignaturePad!.toDataURL('image/png');

      // Generate PDF (no tenant change needed for PDF generation itself)
      const pdf = new jsPDF();
      // ... (add content to PDF - consider adding business name/info) ...
      pdf.setFontSize(18); pdf.text('Employment Contract', 105, 20, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`Business ID: ${businessId}`, 15, 30); // Add business ID to PDF
      pdf.text(`Employee: ${formData.employeeName} (ID: ${formData.employeeId})`, 15, 40);
      pdf.text(`Position: ${formData.position}`, 15, 50);
      pdf.text(`Type: ${formData.contractType}`, 15, 60);
      pdf.text(`Hours/Week: ${formData.contractHours}`, 15, 70);
      pdf.text(`Salary: ${formData.salary} EUR`, 15, 80);
      pdf.text(`Start Date: ${this.formatDate(formData.startDate)}`, 15, 90);
      pdf.text(`End Date: ${formData.endDate ? this.formatDate(formData.endDate) : 'Ongoing'}`, 15, 100);
      pdf.addImage(employerSignatureDataUrl, 'PNG', 15, 115, 80, 40); // Employer signature
      pdf.text('Employer Signature', 15, 160);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 15, 165);
      pdf.rect(110, 115, 80, 40); // Placeholder for employee signature
      pdf.text('Employee Signature', 110, 160);
      const pdfBlob = pdf.output('blob');

      let pdfUrl: string;
      let contractId: string;
      let storagePath: string;

      // Determine Storage path and Contract ID
      if (this.editingContract && this.editingContractData?.id) {
        contractId = this.editingContractData.id;
        // Assume URL might be old format OR relative - try to determine path robustly
        // Best practice: store relative path from the start.
        if (this.editingContractData.contractUrl?.includes(businessId)) {
          // Assume URL contains the businessId and is likely relative or easily parsable
          storagePath = this.editingContractData.contractUrl; // Or parse if needed
          // If it's a download URL, parse it:
          // storagePath = this.getPathFromDownloadUrl(this.editingContractData.contractUrl);
        } else {
          // If URL is missing or doesn't look right, generate a new path
          console.warn("Editing contract but URL seems invalid or missing business context. Generating new path.");
          storagePath = `business/${businessId}/contracts/${contractId}/${formData.employeeId}_contract_${Date.now()}.pdf`;
        }
      } else {
        // Creating new contract
        contractId = doc(collection(this.firestore, `business/${businessId}/contracts`)).id; // Generate ID beforehand
        storagePath = `business/${businessId}/contracts/${contractId}/${formData.employeeId}_contract_${Date.now()}.pdf`;
      }
      console.log(`Using storage path: ${storagePath}`);

      // Upload PDF to Tenant-Aware Storage Path
      const storageRef = ref(this.storage, storagePath);
      await uploadBytes(storageRef, pdfBlob, { contentType: 'application/pdf' });
      pdfUrl = await getDownloadURL(storageRef); // Get download URL for Firestore
      console.log('PDF uploaded/updated. URL:', pdfUrl);


      // Prepare Firestore Data (Convert dates to Timestamps)
      const contractDataForFirestore = this.contractService['convertDatesToTimestamp']({ // Access private helper (or make public)
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        position: formData.position,
        // positionName: selectedPosition ? selectedPosition.name : formData.position, // Store name if needed
        contractType: formData.contractType,
        contractHours: +formData.contractHours, // Ensure number
        salary: +formData.salary, // Ensure number
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined, // Keep undefined if empty
        status: this.editingContract ? (this.editingContractData?.status || 'active') : 'active', // Keep existing status on edit or default active
        updatedAt: new Date(), // Always set on save/update
        contractUrl: storagePath, // Store RELATIVE path
        // Fields specific to existing contract on update
        createdAt: this.editingContract ? (this.editingContractData?.createdAt || new Date()) : new Date(), // Keep original or set new
        signed: this.editingContract ? (this.editingContractData?.signed ?? false) : false, // Keep original or default false
        signedAt: this.editingContract ? this.editingContractData?.signedAt : undefined,
        terminatedAt: this.editingContract ? this.editingContractData?.terminatedAt : undefined,
      });


      // Save/Update Firestore using Tenant-Aware Service
      if (this.editingContract) {
        console.log(`Updating contract ${contractId} in Firestore...`);
        const contractDataWithDates = {
          ...contractDataForFirestore,
          startDate: contractDataForFirestore.startDate?.toDate(),
          endDate: contractDataForFirestore.endDate?.toDate(),
          createdAt: contractDataForFirestore.createdAt?.toDate(),
          updatedAt: contractDataForFirestore.updatedAt?.toDate(),
          signedAt: contractDataForFirestore.signedAt?.toDate(),
          terminatedAt: contractDataForFirestore.terminatedAt?.toDate(),
        };
        await this.contractService.updateContract(contractId, contractDataWithDates); // Service handles tenant path
      } else {
        console.log('Creating new contract in Firestore...');
        contractDataForFirestore.createdAt = Timestamp.fromDate(new Date()); // Ensure createdAt is set for new
        // Create using service which handles tenant path and returns ID (though we generated one)
        const contractDataWithDates = {
          ...contractDataForFirestore,
          startDate: contractDataForFirestore.startDate?.toDate(),
          endDate: contractDataForFirestore.endDate?.toDate(),
          createdAt: contractDataForFirestore.createdAt?.toDate(),
          updatedAt: contractDataForFirestore.updatedAt?.toDate(),
          signedAt: contractDataForFirestore.signedAt?.toDate(),
          terminatedAt: contractDataForFirestore.terminatedAt?.toDate(),
        };
        await this.contractService.createContract(contractDataWithDates);
      }

      // Optional: Update employee record with contract hours (use tenant-aware service)
      try {
        console.log(`Updating employee ${formData.employeeId} record...`);
        await this.usersService.updateEmployee({ // Service handles tenant path
          id: formData.employeeId,
          contractHours: +formData.contractHours
        });
      } catch (userUpdateError) {
        console.error("Failed to update user's contract hours, but contract saved.", userUpdateError);
        // Decide if this warrants showing an error to the admin
      }

      await loading.dismiss();
      this.showToast(`Contract ${this.editingContract ? 'updated' : 'created'} successfully!`, 'success');
      this.closeContractForm(); // Close modal
      // The main list will update via the realtime listener

    } catch (error: any) {
      console.error('Error saving contract:', error);
      await loading.dismiss();
      this.showToast(`Failed to save contract: ${error.message || 'Unknown error'}`, 'danger');
    } finally {
      this.creatingRoom = false; // Alias for savingContract? Use a dedicated flag if needed.
      this.cdr.detectChanges();
    }
  }

  // --- View Contract ---
  /** ADAPTED: Views the contract PDF */
  async viewContract() {
    const storagePath = this.selectedContract?.contractUrl; // Assumes relative path
    if (!storagePath) { this.showAlert('Info', 'Contract document is unavailable.'); return; }

    const loading = await this.loadingController.create({ message: 'Loading document...' });
    await loading.present();
    try {
      const pdfRef = ref(this.storage, storagePath); // Use relative path
      const url = await getDownloadURL(pdfRef);
      window.open(url, '_blank'); // Open in new tab/browser
    } catch (error) {
      console.error("Error getting contract download URL:", error);
      this.showToast("Could not load contract document.", "danger");
    } finally {
      await loading.dismiss();
    }
  }

  // --- Terminate Contract ---
  async confirmTerminateContract() {
    // ... (confirmation logic remains the same) ...
    if (!this.selectedContract) return;
    const alert = await this.alertController.create({
      header: 'Confirm Termination',
      message: `Terminate contract for ${this.selectedContract.employeeName}?`,
      buttons: [{ text: 'Cancel', role: 'cancel' }, { text: 'Terminate', role: 'destructive', handler: () => this.terminateContract() }]
    });
    await alert.present();
  }

  /** ADAPTED: Terminates a contract */
  async terminateContract() {
    if (!this.selectedContract?.id) return;

    const loading = await this.loadingController.create({ message: 'Terminating contract...' });
    await loading.present();

    try {
      // Call tenant-aware service method
      await this.contractService.updateContract(this.selectedContract.id, {
        status: 'terminated',
        updatedAt: new Date(), // Service converts to Timestamp
        terminatedAt: new Date() // Service converts to Timestamp
      });
      // List will update via listener
      await loading.dismiss();
      this.showToast('Contract terminated successfully', 'success');
      this.selectedContract = null; // Close details view
      this.cdr.detectChanges();
    } catch (error: any) {
      console.error('Error terminating contract:', error);
      await loading.dismiss();
      this.showToast(error.message || 'Failed to terminate contract.', 'danger');
    }
  }

  // --- Alert/Toast Helpers (no changes) ---
  async showAlert(header: string, message: string) { /* ... same */
    const alert = await this.alertController.create({ header, message, buttons: ['OK'] }); await alert.present();
  }
  async showToast(message: string, color: string = 'primary', duration: number = 3000) { /* ... same */
    try { const toast = await this.toastController.create({ message, duration, color, position: 'bottom' }); await toast.present(); }
    catch (e) { console.error("showToast error:", e); }
  }

  // --- PDF Helper (no changes) ---
  private async dataURLtoArrayBuffer(dataURL: string): Promise<Uint8Array> { /* ... same */
    const response = await fetch(dataURL); const blob = await response.blob(); return new Uint8Array(await blob.arrayBuffer());
  }
}
