import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';
import { Observable } from 'rxjs';
import SqlImport from '@app/models/sql-import.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class SqlImportService {
  private apiUrl = `${environment.apiUrl}/sql-import`;

  constructor(private http: HttpClient) {}
  getDatabases(): Observable<SqlImport[]> {
    return this.http.get<SqlImport[]>(`${this.apiUrl}/databases`);
  }

  getDatabase(id: number): Observable<SqlImport> {
    return this.http.get<SqlImport>(`${this.apiUrl}/databases/${id}`);
  }

  createDatabase(database: Partial<SqlImport>, sqlFile: File): Observable<SqlImport> {    const formData = new FormData();
    formData.append('database', JSON.stringify(database));
    formData.append('sqlFile', sqlFile);
    return this.http.post<SqlImport>(`${this.apiUrl}/databases`, formData);
  }

  updateDatabase(id: number, database: Partial<SqlImport>, sqlFile?: File): Observable<SqlImport> {
    console.log('updateDatabase called with id:', id, 'database:', database, 'sqlFile:', sqlFile);
    
    const formData = new FormData();
    formData.append('database', JSON.stringify(database));
    if (sqlFile) {
      formData.append('sqlFile', sqlFile);
    }
    
    return this.http.patch<SqlImport>(`${this.apiUrl}/databases/${id}`, formData);
  }

  deleteDatabase(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/databases/${id}`);
  }
  uploadDatabase(file: File, name?: string): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (name) {
      formData.append('name', name);
    }
    
    return this.http.post<SqlImport>(`${this.apiUrl}/upload`, formData, {
      reportProgress: true,
      observe: 'events',
      headers: {
        // Remove Content-Type header to let the browser set it with the boundary
        'Accept': 'application/json'
      }
    });
  }

  executeQuery(databaseId: number, query: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/query`, { databaseId, query });
  }
}


export default SqlImportService;
