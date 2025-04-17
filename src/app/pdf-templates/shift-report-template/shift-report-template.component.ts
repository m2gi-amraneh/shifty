import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ShiftReport } from '../../services/shift-report.service'; // Adjust path

@Component({
  selector: 'app-shift-report-template',
  standalone: true,
  imports: [CommonModule],
  template: `
    <!-- This is the structure that will be converted to PDF -->
    <div class="pdf-container" id="pdf-content-wrapper">
      <header>
        <h1>Shift Hours Report</h1>
        <p><strong>Employee ID:</strong> {{ employeeId }}</p>
        <p><strong>Period:</strong> {{ startDate | date:'shortDate' }} - {{ endDate | date:'shortDate' }}</p>
      </header>

      <hr>

      <main>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Total Hours</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let shift of shifts">
              <td>{{ shift.badgeInTime | date:'shortDate' }}</td>
              <td>{{ shift.badgeInTime | date:'shortTime' }}</td>
              <td>{{ shift.badgeOutTime ? (shift.badgeOutTime | date:'shortTime') : 'N/A' }}</td>
              <td>{{ shift.totalHours | number:'1.1-2' }}</td>
            </tr>
            <tr *ngIf="!shifts || shifts.length === 0">
               <td colspan="4">No shifts recorded for this period.</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colspan="3"><strong>Total Report Hours:</strong></td>
              <td><strong>{{ calculateTotalHours(shifts) | number:'1.1-2' }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </main>

      <footer>
        <p>Generated on: {{ generationDate | date:'medium' }}</p>
      </footer>
    </div>
  `,
  styles: [`
    /* Add specific styles for your PDF here. Keep it relatively simple. */
    /* jsPDF html() has limitations, avoid complex CSS like flex/grid if possible */
    /* Use basic block/inline, margins, padding, borders, font sizes, colors */
    .pdf-container {
      font-family: 'Helvetica', 'Arial', sans-serif; /* Common PDF fonts */
      padding: 20px; /* Simulate page margins */
      width: 700px; /* Approx A4 width minus padding in pixels for rendering */
      color: #333;
    }
    header, footer {
      margin-bottom: 15px;
      border-bottom: 1px solid #eee;
      padding-bottom: 10px;
    }
    footer {
        margin-top: 20px;
        border-top: 1px solid #eee;
        border-bottom: none;
        font-size: 0.8em;
        color: #777;
    }
    h1 {
      font-size: 1.8em;
      color: #1e88e5; /* Blue */
      margin-bottom: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    th, td {
      border: 1px solid #ddd;
      padding: 8px;
      text-align: left;
      font-size: 0.9em;
    }
    th {
      background-color: #f2f2f2;
      font-weight: bold;
    }
    tbody tr:nth-child(even) {
      background-color: #f9f9f9;
    }
    tfoot td {
        border-top: 2px solid #333;
    }
    tfoot strong {
        font-size: 1.1em;
    }
    hr {
        border: none;
        border-top: 1px dashed #ccc;
        margin: 15px 0;
    }
    /* Example for page breaks (might need testing/adjustment) */
    .page-break {
        page-break-before: always;
    }
  `]
})
export class ShiftReportTemplateComponent {
  @Input() shifts: ShiftReport[] = [];
  @Input() employeeId: string | null = null;
  @Input() startDate: Date | null = null;
  @Input() endDate: Date | null = null;
  generationDate = new Date(); // Capture generation time

  calculateTotalHours(shifts: ShiftReport[]): number {
    if (!shifts) return 0;
    return shifts.reduce((total, shift) => total + (shift.totalHours || 0), 0);
  }
}
