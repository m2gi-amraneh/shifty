// shift-report.service.ts
import { Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  query,
  where,
  getDocs,
  orderBy,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export interface ShiftReport {
  shiftId: string;
  employeeId: string;
  checkInTime: Date;
  checkOutTime?: Date;
  totalHours: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftReportService {
  constructor(private firestore: Firestore) {}

  // Fetch shifts for a specific employee within a date range
  getShiftsByDateRange(
    employeeId: string,
    startDate: Date,
    endDate: Date
  ): Observable<ShiftReport[]> {
    const shiftsCollection = collection(this.firestore, 'badgedShifts');

    const q = query(
      shiftsCollection,
      where('employeeId', '==', employeeId),
      where('badgeInTime', '>=', startDate),
      where('badgeInTime', '<=', endDate),
      orderBy('badgeInTime')
    );

    return from(getDocs(q)).pipe(
      map((snapshot) =>
        snapshot.docs.map((doc) => {
          const data = doc.data() as any;
          return {
            id: doc.id,
            ...data,
            totalHours: this.calculateShiftHours(
              data.badgeInTime,
              data.badgeOutTime
            ),
          };
        })
      )
    );
  }

  // Calculate total hours for a shift
  private calculateShiftHours(checkIn: Date, checkOut?: Date): number {
    if (!checkOut) return 0;
    const diffMs = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return diffMs / (1000 * 60 * 60); // Convert to hours
  }

  // Generate PDF Report
  async generatePdfReport(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    shifts: ShiftReport[]
  ): Promise<void> {
    // Create PDF
    const doc = new jsPDF();

    // Report Header
    doc.setFontSize(18);
    doc.text('Shift Hours Report', 10, 20);

    // Employee and Date Info
    doc.setFontSize(12);
    doc.text(`Employee ID: ${employeeId}`, 10, 30);
    doc.text(
      `Period: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
      10,
      40
    );

    // Shift Details
    doc.setFontSize(10);
    let y = 50;
    doc.text('Date', 10, y);
    doc.text('Check In', 50, y);
    doc.text('Check Out', 90, y);
    doc.text('Total Hours', 130, y);

    // Add shifts
    y += 10;
    let totalReportHours = 0;
    shifts.forEach((shift) => {
      doc.text(new Date(shift.checkInTime).toLocaleDateString(), 10, y);
      doc.text(new Date(shift.checkInTime).toLocaleTimeString(), 50, y);
      doc.text(
        shift.checkOutTime
          ? new Date(shift.checkOutTime).toLocaleTimeString()
          : 'Not Checked Out',
        90,
        y
      );
      doc.text(shift.totalHours.toFixed(2), 130, y);

      totalReportHours += shift.totalHours;
      y += 10;
    });

    // Total Hours
    doc.setFontSize(12);
    doc.text(`Total Hours: ${totalReportHours.toFixed(2)}`, 10, y + 10);

    // Save PDF
    doc.save(
      `shift_report_${startDate.toISOString()}_${endDate.toISOString()}.pdf`
    );
  }
}
