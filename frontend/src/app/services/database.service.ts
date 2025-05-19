import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Database } from '@app/models/database.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class DatabaseService {
  private apiUrl = `${environment.apiUrl}/databases`;

  constructor(private http: HttpClient) {}

  getDatabases(): Observable<Database[]> {
    return this.http.get<Database[]>(this.apiUrl);
  }

  getDatabase(id: number): Observable<Database> {
    return this.http.get<Database>(`${this.apiUrl}/${id}`);
  }

  createDatabase(database: Partial<Database>, sqlFile: File): Observable<Database> {
    const formData = new FormData();
    formData.append('database', JSON.stringify(database));
    formData.append('sqlFile', sqlFile);
    return this.http.post<Database>(this.apiUrl, formData);
  }

  updateDatabase(id: number, database: Partial<Database>, sqlFile?: File): Observable<Database> {
    const formData = new FormData();
    formData.append('database', JSON.stringify(database));
    if (sqlFile) {
      formData.append('sqlFile', sqlFile);
    }
    return this.http.patch<Database>(`${this.apiUrl}/${id}`, formData);
  }

  deleteDatabase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}

export default DatabaseService; 