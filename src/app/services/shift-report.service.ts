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
import { Timestamp } from '@angular/fire/firestore';

export interface ShiftReport {
  shiftId: string;
  employeeId: string;
  badgeInTime: Date;
  badgeOutTime?: Date;
  totalHours: number;
}

@Injectable({
  providedIn: 'root',
})
export class ShiftReportService {
  constructor(private firestore: Firestore) { }

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
          const data = doc.data();
          const badgeInTime = (data['badgeInTime'] as Timestamp).toDate();
          const badgeOutTime = data['badgeOutTime']
            ? (data['badgeOutTime'] as Timestamp).toDate()
            : undefined;

          return {
            shiftId: doc.id,
            employeeId: data['employeeId'],
            badgeInTime,
            badgeOutTime,
            totalHours: this.calculateShiftHours(badgeInTime, badgeOutTime),
          };
        })
      )
    );
  }

  private calculateShiftHours(checkIn: Date, checkOut?: Date): number {
    if (!checkOut) return 0;
    const diffMs = checkOut.getTime() - checkIn.getTime();
    return diffMs / (1000 * 60 * 60);
  }

  async generatePdfReport(
    employeeId: string,
    startDate: Date,
    endDate: Date,
    shifts: ShiftReport[]
  ): Promise<void> {
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
      doc.text(shift.badgeInTime.toLocaleDateString(), 10, y);
      doc.text(shift.badgeInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 50, y);
      doc.text(
        shift.badgeOutTime
          ? shift.badgeOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
      `shift_report_${employeeId}_${startDate.toISOString()}_${endDate.toISOString()}.pdf`
    );
  }
}
