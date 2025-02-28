import { Component, ViewChild, ElementRef, OnInit, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';
import { FormsModule, ReactiveFormsModule, FormGroup, FormBuilder, Validators } from '@angular/forms';
import { Storage, ref, uploadBytes, getDownloadURL } from '@angular/fire/storage';
import { Firestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from '@angular/fire/firestore';
import SignaturePad from 'signature_pad';
import { jsPDF } from 'jspdf';
import { AlertController, LoadingController, ModalController } from '@ionic/angular';
import { Auth } from '@angular/fire/auth';
import { ContractService } from '../services/contract.service';
import { Observable, of, Subscription } from 'rxjs';
import { BrowserModule } from '@angular/platform-browser';
import { addIcons } from 'ionicons';
import { add, closeCircleOutline, closeOutline, createOutline, documentTextOutline, eyeOutline, refreshOutline, saveOutline } from 'ionicons/icons';
import { Employee, UsersService } from '../services/users.service';
import { PositionsService } from '../services/positions.service';
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
export class AdminContractsPage implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('employerSignatureCanvas') employerSignatureCanvas!: ElementRef;
  employerSignaturePad: SignaturePad | undefined;
  selectedContract: any = null; // For viewing details
  editingContractData: any = null; // New property to hold the contract being edited
  contracts: any[] = [];
  filteredContracts: any[] = [];
  selectedSegment: string = 'all';
  searchTerm: string = '';
  isContractFormOpen: boolean = false;
  editingContract: boolean = false;
  contractForm: FormGroup;
  employees: Employee[] = [];
  positions: any[] = [];

  private contractsSubscription: Subscription | undefined;
  private positionsSubscription: Subscription | undefined;
  private employeesSubscription: Subscription | undefined;

  constructor(
    private fb: FormBuilder,
    private storage: Storage,
    private firestore: Firestore,
    private auth: Auth,
    private contractService: ContractService,
    private positionsService: PositionsService,
    private usersService: UsersService,
    private alertController: AlertController,
    private loadingController: LoadingController,
    private modalController: ModalController
  ) {
    this.contractForm = this.createContractForm();
  }

  ngOnInit() {
    this.subscribeToContracts();
    this.subscribeToPositions();
    this.subscribeToEmployees();
  }

  ngAfterViewInit() {
    // Signature pad will be initialized when the modal opens
  }

  ngOnDestroy() {
    // Clean up subscriptions to prevent memory leaks
    if (this.contractsSubscription) {
      this.contractsSubscription.unsubscribe();
    }

    if (this.positionsSubscription) {
      this.positionsSubscription.unsubscribe();
    }

    if (this.employeesSubscription) {
      this.employeesSubscription.unsubscribe();
    }
  }

  private createContractForm(): FormGroup {
    return this.fb.group({
      employeeId: ['', Validators.required],
      employeeName: ['', Validators.required],
      contractType: ['full-time', Validators.required],
      position: ['', Validators.required],
      contractHours: [40, [Validators.required, Validators.min(1)]],
      salary: [0, [Validators.required, Validators.min(0)]],
      startDate: [new Date().toISOString().split('T')[0], Validators.required],
      endDate: [''],
      status: ['active']
    });
  }

  private subscribeToContracts() {
    // Create an observable for real-time contract updates
    const contractsObservable = this.contractService.getContracts();

    this.contractsSubscription = contractsObservable.subscribe(
      (contracts) => {
        this.contracts = contracts;
        this.filterContracts();
      },
      (error) => {
        console.error('Error loading contracts:', error);
        this.showAlert('Error', 'Failed to load contracts');
      }
    );
  }

  private subscribeToPositions() {
    this.positionsSubscription = this.positionsService.getPositions().subscribe(
      (positions: any[]) => {
        this.positions = positions;
      },
      (error: any) => {
        console.error('Error loading positions:', error);
        this.showAlert('Error', 'Failed to load positions');
      }
    );
  }

  private subscribeToEmployees() {
    this.employeesSubscription = this.usersService.getEmployees().subscribe(
      (employees: Employee[]) => {
        this.employees = employees;
      },
      (error: any) => {
        console.error('Error loading employees:', error);
        this.showAlert('Error', 'Failed to load employees');
      }
    );
  }

  filterContracts() {
    let filtered = [...this.contracts];

    // Filter by segment
    if (this.selectedSegment !== 'all') {
      if (this.selectedSegment === 'pending') {
        filtered = filtered.filter(c => !c.signed && c.status === 'active');
      } else if (this.selectedSegment === 'signed') {
        filtered = filtered.filter(c => c.signed && c.status === 'active');
      } else if (this.selectedSegment === 'terminated') {
        filtered = filtered.filter(c => c.status === 'terminated');
      }
    }

    // Filter by search term
    if (this.searchTerm.trim() !== '') {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(c =>
        c.employeeName?.toLowerCase().includes(term) ||
        c.position?.toLowerCase().includes(term)
      );
    }

    this.filteredContracts = filtered;
  }

  onSegmentChange(event: any) {
    this.selectedSegment = event.detail.value;
    this.filterContracts();
  }

  selectContract(contract: any) {
    this.selectedContract = contract;
  }

  getContractStatus(contract: any): string {
    if (contract.status === 'terminated') return 'Terminated';
    if (contract.signed) return 'Signed';
    return 'Pending Signature';
  }

  getBadgeColor(contract: any): string {
    if (contract.status === 'terminated') return 'danger';
    if (contract.signed) return 'success';
    return 'warning';
  }

  async openContractForm() {
    this.isContractFormOpen = true;
    this.editingContract = false;
    this.contractForm.reset({
      contractType: 'full-time',
      contractHours: 40,
      startDate: new Date().toISOString().split('T')[0],
      status: 'active',
      salary: 0
    });

    setTimeout(() => {
      this.initializeEmployerSignaturePad();
    }, 150);
  }

  closeContractForm() {
    this.isContractFormOpen = false;
  }

  async editContract() {
    if (!this.selectedContract) return;
    if (this.selectedContract.signed) {
      await this.showAlert('Not Allowed', 'Signed contracts cannot be edited');
      return;
    }

    this.editingContract = true;
    this.editingContractData = { ...this.selectedContract }; // Store the contract being edited
    this.contractForm.patchValue({
      employeeId: this.selectedContract.employeeId,
      employeeName: this.selectedContract.employeeName,
      contractType: this.selectedContract.contractType,
      position: this.selectedContract.position,
      contractHours: this.selectedContract.contractHours,
      salary: this.selectedContract.salary,
      startDate: new Date(this.selectedContract.startDate).toISOString().split('T')[0],
      endDate: this.selectedContract.endDate ? new Date(this.selectedContract.endDate).toISOString().split('T')[0] : '',
      status: this.selectedContract.status
    });

    // Don’t clear selectedContract here; keep it for viewing if needed
    // this.selectedContract = null; // Remove this line
    this.isContractFormOpen = true;

    setTimeout(() => {
      this.initializeEmployerSignaturePad();
    }, 150);
  }
  async onEmployeeChange(event: any) {
    const employeeId = event.detail.value;

    if (!employeeId) return;

    // First, set the employee name
    const selectedEmployee = this.employees.find(emp => emp.id === employeeId);
    if (selectedEmployee) {
      this.contractForm.patchValue({
        employeeName: selectedEmployee.name
      });
    }

    // Then, check if the employee already has an active contract
    try {
      const loading = await this.loadingController.create({
        message: 'Checking employee status...',
        duration: 1000
      });
      await loading.present();

      const hasActiveContract = await this.checkEmployeeHasActiveContract(employeeId);

      if (hasActiveContract && !this.editingContract) {
        await this.showAlert('Warning', 'This employee already has an active contract. Please terminate the existing contract before creating a new one.');
        this.contractForm.patchValue({
          employeeId: '',
          employeeName: ''
        });
      }
    } catch (error) {
      console.error('Error checking employee contract status:', error);
    }
  }

  private async checkEmployeeHasActiveContract(employeeId: string): Promise<boolean> {
    try {
      const contractsRef = collection(this.firestore, 'contracts');
      const q = query(
        contractsRef,
        where('employeeId', '==', employeeId),
        where('status', '==', 'active')
      );

      const snapshot = await getDocs(q);

      // If we're editing, we need to exclude the current contract
      if (this.editingContract && this.selectedContract) {
        return snapshot.docs.some(doc => doc.id !== this.selectedContract.id);
      }

      return !snapshot.empty;
    } catch (error) {
      console.error('Error checking for active contracts:', error);
      return false;
    }
  }

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

  clearEmployerSignature() {
    if (this.employerSignaturePad) {
      this.employerSignaturePad.clear();
    }
  }

  isEmployerSignatureValid(): boolean {
    return this.employerSignaturePad?.isEmpty() === false;
  }

  formatDate(dateString: string): string {
    return dateString ? new Date(dateString).toLocaleDateString() : '';
  }

  async saveContract() {
    if (!this.contractForm.valid || !this.isEmployerSignatureValid()) {
      this.showAlert('Error', 'Please fill all required fields and provide your signature');
      return;
    }

    const loading = await this.loadingController.create({
      message: 'Saving contract...',
    });
    await loading.present();

    try {
      const formData = this.contractForm.value;

      console.log('Editing contract:', this.editingContract);
      console.log('Editing contract data:', this.editingContractData);

      if (!this.editingContract) {
        const hasActiveContract = await this.checkEmployeeHasActiveContract(formData.employeeId);
        if (hasActiveContract) {
          await loading.dismiss();
          await this.showAlert('Error', 'This employee already has an active contract. Please terminate the existing contract first.');
          return;
        }
      }

      const employerSignatureData = this.employerSignaturePad!.toDataURL('image/png');
      const pdf = new jsPDF();
      pdf.setFontSize(20);
      pdf.text('EMPLOYMENT CONTRACT', 20, 20);
      pdf.setFontSize(12);
      const content = [
        `Employee: ${formData.employeeName}`,
        `Position: ${formData.position}`,
        `Contract Type: ${formData.contractType}`,
        `Hours: ${formData.contractHours} per week`,
        `Salary: ${formData.salary}€`,
        `Start Date: ${new Date(formData.startDate).toLocaleDateString()}`,
        `End Date: ${formData.endDate ? new Date(formData.endDate).toLocaleDateString() : 'Ongoing'}`
      ];
      content.forEach((text, index) => pdf.text(text, 20, 40 + (index * 10)));
      pdf.addImage(employerSignatureData, 'PNG', 20, 120, 70, 40);
      pdf.text('Employer Signature', 20, 170);
      pdf.text(`Date: ${new Date().toLocaleDateString()}`, 20, 180);
      pdf.text('Employee Signature', 120, 170);
      pdf.rect(120, 120, 70, 40);

      const pdfBlob = pdf.output('blob');
      let pdfUrl;
      let contractId;

      if (this.editingContract && this.editingContractData && this.editingContractData.id && this.editingContractData.contractUrl) {
        contractId = this.editingContractData.id;
        console.log('Updating contract with ID:', contractId);

        const existingFilePath = this.editingContractData.contractUrl.split('?')[0].split('/o/')[1].replace(/%2F/g, '/');
        console.log('Using existing file path:', existingFilePath);

        const storageRef = ref(this.storage, existingFilePath);
        await uploadBytes(storageRef, pdfBlob);
        pdfUrl = await getDownloadURL(storageRef);
        console.log('Updated PDF URL:', pdfUrl);
      } else if (!this.editingContract) {
        const fileName = `contracts/${formData.employeeId}_${Date.now()}.pdf`;
        console.log('Creating new contract with file name:', fileName);

        const storageRef = ref(this.storage, fileName);
        await uploadBytes(storageRef, pdfBlob);
        pdfUrl = await getDownloadURL(storageRef);
        console.log('New PDF URL:', pdfUrl);
      } else {
        throw new Error('Invalid state: Editing flag is set but no valid contract data provided');
      }

      const contractData: any = {
        employeeId: formData.employeeId,
        employeeName: formData.employeeName,
        position: formData.position,
        contractType: formData.contractType,
        contractHours: formData.contractHours,
        salary: formData.salary,
        startDate: new Date(formData.startDate),
        endDate: formData.endDate ? new Date(formData.endDate) : null,
        status: 'active',
        updatedAt: new Date(),
        contractUrl: pdfUrl,
        positionName: formData.position
      };

      if (this.editingContract && this.editingContractData && this.editingContractData.id) {
        // Sanitize optional fields to avoid undefined
        const updateData = {
          ...contractData,
          createdAt: this.editingContractData.createdAt, // Should always exist
          signed: this.editingContractData.signed ?? false, // Default to false if undefined
          signedAt: this.editingContractData.signedAt ?? null // Use null if undefined
        };
        console.log('Data being sent to update:', updateData);

        await this.contractService.updateContract(contractId, updateData);
        console.log('Contract updated in Firestore with ID:', contractId);
      } else if (!this.editingContract) {
        contractData.createdAt = new Date();
        contractData.signed = false;
        contractData.signedAt = null; // Explicitly set to null for new contracts
        contractId = await this.contractService.createContract(contractData);
        console.log('New contract created in Firestore with ID:', contractId);

        try {
          const employee = this.employees.find(e => e.id === formData.employeeId);
          if (employee) {
            const updatedEmployee: Employee = {
              ...employee,
              contractHours: formData.contractHours
            };
            await this.usersService.updateEmployee(updatedEmployee);
            console.log('Employee contract hours updated');
          }
        } catch (updateError) {
          console.error('Error updating employee contract hours:', updateError);
        }
      }

      await loading.dismiss();
      this.showAlert(
        'Success',
        `Contract ${this.editingContract ? 'updated' : 'created'} successfully! The employee can now view and sign it.`
      );
      this.closeContractForm();
      this.editingContractData = null;
    } catch (error) {
      console.error('Error saving contract:', error);
      await loading.dismiss();
      this.showAlert('Error', `Failed to ${this.editingContract ? 'update' : 'create'} contract: ` + (error as any).message);
    }
  }
  async viewContract() {
    if (!this.selectedContract?.contractUrl) {
      this.showAlert('Info', 'Contract document is unavailable.');
      return;
    }

    window.open(this.selectedContract.contractUrl, '_blank');
  }

  async confirmTerminateContract() {
    if (!this.selectedContract) return;

    const alert = await this.alertController.create({
      header: 'Confirm Termination',
      message: `Are you sure you want to terminate the contract with ${this.selectedContract.employeeName}?`,
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Terminate',
          role: 'destructive',
          handler: () => {
            this.terminateContract();
          }
        }
      ]
    });

    await alert.present();
  }

  async terminateContract() {
    if (!this.selectedContract) return;

    const loading = await this.loadingController.create({
      message: 'Terminating contract...',
    });
    await loading.present();

    try {
      // Update contract status
      await this.contractService.updateContract(this.selectedContract.id, {
        status: 'terminated',
        updatedAt: new Date(),
        terminatedAt: new Date()
      });

      // No need to update local data since we have realtime updates

      await loading.dismiss();
      this.showAlert('Success', 'Contract terminated successfully');
    } catch (error) {
      console.error('Error terminating contract:', error);
      await loading.dismiss();
      this.showAlert('Error', 'Failed to terminate contract: ' + (error as any).message);
    }
  }

  async showAlert(header: string, message: string) {
    const alert = await this.alertController.create({
      header,
      message,
      buttons: ['OK']
    });
    await alert.present();
  }
}
