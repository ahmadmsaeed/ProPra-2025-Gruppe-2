import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface DatabaseGenerationRequest {
  prompt: string;
  complexity: 'simple' | 'moderate' | 'complex';
  tableCount: number;
  databaseName?: string;
}

export interface GeneratedDatabase {
  name: string;
  schema: string;
  seedData: string;
  description?: string;
}

@Injectable({
  providedIn: 'root'
})
export class DatabaseGenerationService {
  private apiUrl = `${environment.apiUrl}/sql-import`;

  constructor(private http: HttpClient) {}

  generateDatabase(request: DatabaseGenerationRequest): Observable<GeneratedDatabase> {
    return this.http.post<GeneratedDatabase>(`${this.apiUrl}/generate-database`, request);
  }
}
