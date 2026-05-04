import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService, User } from './user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  users: User[] = [];
  firstName = '';
  lastName = '';
  username = '';
  email = '';
  phoneNumber = '';
  prn = '';
  editingId: string | null = null;
  loading = false;
  message = '';
  messageType: 'success' | 'error' = 'success';

  constructor(private userService: UserService) {}

  ngOnInit(): void {
    this.loadUsers();
  }

  loadUsers(): void {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.showMessage('Failed to load users. Make sure the backend is running.', 'error');
        this.loading = false;
      }
    });
  }

  addUser(): void {
    if (!this.firstName.trim() || !this.lastName.trim() || !this.username.trim() || !this.email.trim() || !this.phoneNumber.trim() || !this.prn.trim()) {
      this.showMessage('Please fill in all fields.', 'error');
      return;
    }

    const user: User = {
      firstName: this.firstName,
      lastName: this.lastName,
      username: this.username,
      email: this.email,
      phoneNumber: this.phoneNumber,
      prn: this.prn
    };

    if (this.editingId) {
      // Update mode
      this.userService.updateUser(this.editingId, user).subscribe({
        next: (response: any) => {
          this.showMessage(response.message || 'User updated successfully!', 'success');
          this.resetForm();
          this.loadUsers();
        },
        error: (err) => {
          console.error('Error updating user:', err);
          const errorMsg = err.error?.error || 'Failed to update user.';
          this.showMessage(errorMsg, 'error');
        }
      });
    } else {
      // Add mode
      this.userService.addUser(user).subscribe({
        next: (response: any) => {
          this.showMessage(response.message || 'User added successfully!', 'success');
          this.resetForm();
          this.loadUsers();
        },
        error: (err) => {
          console.error('Error adding user:', err);
          const errorMsg = err.error?.error || 'Failed to add user.';
          this.showMessage(errorMsg, 'error');
        }
      });
    }
  }

  editUser(user: User): void {
    this.firstName = user.firstName;
    this.lastName = user.lastName;
    this.username = user.username;
    this.email = user.email;
    this.phoneNumber = user.phoneNumber;
    this.prn = user.prn;
    this.editingId = user._id || null;
  }

  deleteUser(id: string): void {
    this.userService.deleteUser(id).subscribe({
      next: (response: any) => {
        this.showMessage(response.message || 'User deleted successfully!', 'success');
        this.loadUsers();
        if (this.editingId === id) {
          this.resetForm();
        }
      },
      error: (err) => {
        console.error('Error deleting user:', err);
        const errorMsg = err.error?.error || 'Failed to delete user.';
        this.showMessage(errorMsg, 'error');
      }
    });
  }

  cancelEdit(): void {
    this.resetForm();
  }

  private resetForm(): void {
    this.firstName = '';
    this.lastName = '';
    this.username = '';
    this.email = '';
    this.phoneNumber = '';
    this.prn = '';
    this.editingId = null;
  }

  private showMessage(msg: string, type: 'success' | 'error'): void {
    this.message = msg;
    this.messageType = type;
    setTimeout(() => (this.message = ''), 5000);
  }
}
