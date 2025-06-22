import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';

interface PayslipData {
  PERNR: string;
  ENAME: string;
  PLANS: string;
  BEGDA: string;
  ENDDA: string;
  BASIC_SALARY: number;
  ALLOWANCES: number;
  OVERTIME: number;
  GROSS_SALARY: number;
  TAX: number;
  SOCIAL_SECURITY: number;
  INSURANCE: number;
  OTHER_DEDUCTIONS: number;
  TOTAL_DEDUCTIONS: number;
  NET_SALARY: number;
  PAYMENT_DATE: string;
  PAYMENT_METHOD: string;
  CURRENCY: string;
}

@Component({
  selector: 'app-payslip',
  standalone: true,
  imports: [
    CommonModule,
    MatProgressSpinnerModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    ReactiveFormsModule
  ],
  templateUrl: './payment.component.html',
  styleUrls: ['./payment.component.scss']
})
export class PaymentComponent implements OnInit {
  isLoading = false;
  error: string = '';
  pernr: string = '';
  payslipData: PayslipData | null = null;
  
  months = [
    { value: '01', name: 'January' },
    { value: '02', name: 'February' },
    { value: '03', name: 'March' },
    { value: '04', name: 'April' },
    { value: '05', name: 'May' },
    { value: '06', name: 'June' },
    { value: '07', name: 'July' },
    { value: '08', name: 'August' },
    { value: '09', name: 'September' },
    { value: '10', name: 'October' },
    { value: '11', name: 'November' },
    { value: '12', name: 'December' }
  ];
  years: number[] = [];
  pdfUrl: string | null = null;

  payslipForm = new FormGroup({
    month: new FormControl('', [Validators.required]),
    year: new FormControl('', [Validators.required])
  });

  constructor(
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    // Generate years from current year to 10 years back
    const currentYear = new Date().getFullYear();
    for (let year = currentYear; year >= currentYear - 10; year--) {
      this.years.push(year);
    }
  }

  ngOnInit(): void {
    this.pernr = localStorage.getItem('employeeId') || '';
    if (!this.pernr) {
      this.error = 'Employee ID not found. Please log in again.';
    }
  }

  fetchPayslip(): void {
    if (this.payslipForm.invalid || !this.pernr) {
      return;
    }

    this.isLoading = true;
    this.error = '';
    this.pdfUrl = null;
    this.payslipData = null;

    const formValue = this.payslipForm.value;
    const month = formValue.month || '';
    const year = formValue.year || '';

    // First, fetch the payslip data for analysis
    this.http.post<any>(
      'http://localhost:3030/payslipdata',
      {
        PERNR: this.pernr,
        MONTH: month,
        YEAR: year
      }
    ).subscribe({
      next: (response) => {
        if (response.status === 'S' && response.payslipData) {
          this.payslipData = response.payslipData;
          
          // Now fetch the PDF
          this.fetchPayslipPDF(month, year);
        } else {
          this.isLoading = false;
          this.error = response.message || 'No payslip data found for the selected period.';
          this.snackBar.open(this.error, 'Close', {
            duration: 3000,
            panelClass: ['error-snackbar']
          });
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to fetch payslip data. Please try again.';
        console.error('Payslip data error:', err);
        this.snackBar.open('Error fetching payslip data!', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private fetchPayslipPDF(month: string, year: string): void {
    this.http.post(
      'http://localhost:3030/paymentslip',
      {
        employeeId: this.pernr,
        month: month,
        year: year
      },
      { responseType: 'blob' }
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        const blob = new Blob([response], { type: 'application/pdf' });
        this.pdfUrl = URL.createObjectURL(blob);
        
        this.handlePdfResponse(response, `Payslip_${this.pernr}_${year}${month}.pdf`);
        
        this.snackBar.open('Payslip downloaded successfully!', 'Close', {
          duration: 3000
        });
      },
      error: (err) => {
        this.isLoading = false;
        this.error = 'Failed to fetch payslip PDF. Please try again.';
        console.error('Payslip PDF error:', err);
        this.snackBar.open('Error fetching payslip PDF!', 'Close', {
          duration: 3000,
          panelClass: ['error-snackbar']
        });
      }
    });
  }

  private handlePdfResponse(pdfBlob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    }, 100);
  }

  printPayslip(): void {
    if (!this.pdfUrl) return;
    
    const printWindow = window.open(this.pdfUrl, '_blank');
    if (printWindow) {
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }

  // Analysis helper methods
  getSelectedMonthYear(): string {
    const month = this.payslipForm.get('month')?.value;
    const year = this.payslipForm.get('year')?.value;
    
    if (month && year) {
      const monthName = this.months.find(m => m.value === month)?.name || '';
      return `${monthName} ${year}`;
    }
    return '';
  }

  formatCurrency(amount: number | string): string {
    if (!amount) return '₹0.00';
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `₹${numAmount.toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  }

  formatPayPeriod(startDate: string, endDate: string): string {
    if (!startDate || !endDate) return 'N/A';
    return `${this.formatDate(startDate)} - ${this.formatDate(endDate)}`;
  }

  calculateTaxPercentage(): string {
    if (!this.payslipData || !this.payslipData.GROSS_SALARY || !this.payslipData.TAX) {
      return '0.0';
    }
    const percentage = (this.payslipData.TAX / this.payslipData.GROSS_SALARY) * 100;
    return percentage.toFixed(1);
  }

  calculateDeductionPercentage(): string {
    if (!this.payslipData || !this.payslipData.GROSS_SALARY || !this.payslipData.TOTAL_DEDUCTIONS) {
      return '0.0';
    }
    const percentage = (this.payslipData.TOTAL_DEDUCTIONS / this.payslipData.GROSS_SALARY) * 100;
    return percentage.toFixed(1);
  }
}