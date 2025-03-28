import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'filterCurrentUser',
  standalone: true // Make the pipe standalone
})
export class FilterCurrentUserPipe implements PipeTransform {
  transform(users: any[] | null, currentUserId: string | undefined): any[] {
    if (!users || !currentUserId) {
      return users || [];
    }
    return users.filter(user => user.id !== currentUserId);
  }
}
