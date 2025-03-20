# Employee Management System

[![Ionic](https://img.shields.io/badge/Ionic-3880FF?style=for-the-badge&logo=ionic&logoColor=white)](https://ionicframework.com/)
[![Angular](https://img.shields.io/badge/Angular-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)

A comprehensive mobile-first admin dashboard for employee management, time tracking, shift scheduling, and contract management. This dual-interface application offers separate views for employers and employees with dedicated features for each user type.

## Features

### Employer Dashboard
- **Badge Station**
  - Employee time tracking with personal code input
  - Check-in/check-out functionality
  - Real-time attendance monitoring
- **Schedule Management**
  - Create and manage employee shifts
  - Assign employees to specific schedules
  - Visual calendar interface
- **Absence Management**
  - Review and approve/refuse employee absence requests
  - Automated notification system
  - Absence tracking and reporting
- **Closing Period Management**
  - Set company/department closure dates
  - Holiday and special event planning
- **Contract Management**
  - Create and customize employee contracts
  - Digital contract distribution
  - Contract status tracking

### Employee Dashboard
- **Personal Schedule View**
  - View upcoming shifts and assignments
  - Calendar integration
  - Notification for schedule changes
- **Absence Requests**
  - Submit time-off and absence requests
  - Track request status
  - View remaining leave allowance
- **Digital Contract Signing**
  - View and sign contracts electronically
  - Contract history and storage
  - Document verification
- **Reports & Documentation**
  - Download working hours reports as PDF
  - Access to contract documents
  - Personal performance metrics

### Technical Features
- **Modern UI Design**
  - Glassmorphism effects
  - Responsive grid layout
  - Smooth animations and transitions
- **Architecture**
  - Mobile-first approach
  - Angular reactive forms
  - Router-based navigation
  - Component-based architecture
- **Security**
  - Role-based access control

  - Secure digital signatures

## Installation

1. **Prerequisites**
   - Node.js v18+
   - npm v9+
   - Ionic CLI v7+
   - Angular CLI v19

2. **Clone the repository**
   ```bash
   git clone https://github.com/m2gi-amraneh/shifty.git
 
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Run the development server**
   ```bash
   ionic serve
   ```

5. **Build for production**
   ```bash
   ionic build --prod
   ```

## Usage

### Employer Access
Employers can access the admin dashboard to:
- Monitor employee attendance through the badge station
- Create and manage work schedules
- Process absence requests
- Generate and distribute employment contracts
- Configure company closing periods
-Bagde station for employee 
### Employee Access
Employees can use their portal to:
- View their assigned work schedule
- Submit requests for time off
- Digitally sign employment contracts
- Download their working hours reports and contracts in PDF format

## Technology Stack

- **Frontend**: Ionic, Angular
- **State Management**: NgRx
- **UI Components**: Ionic Components, Custom Components
- **Authentication**: Firebase
- **PDF Generation**: PDFMake

## Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add some amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
