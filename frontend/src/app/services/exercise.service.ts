import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Exercise } from '../models/exercise.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ExerciseService {
  private apiUrl = `${environment.apiUrl}/exercises`;

  constructor(private http: HttpClient) {}

  getExercises(): Observable<Exercise[]> {
    return this.http.get<Exercise[]>(this.apiUrl);
  }

  getExercise(id: number): Observable<Exercise> {
    return this.http.get<Exercise>(`${this.apiUrl}/${id}`);
  }

  createExercise(exercise: Partial<Exercise>, sqlFile?: File): Observable<Exercise> {
    const formData = new FormData();
    formData.append('exercise', JSON.stringify(exercise));
    if (sqlFile) {
      formData.append('sqlFile', sqlFile);
    }
    return this.http.post<Exercise>(this.apiUrl, formData);
  }

  updateExercise(id: number, exercise: Partial<Exercise>, sqlFile?: File): Observable<Exercise> {
    const formData = new FormData();
    formData.append('exercise', JSON.stringify(exercise));
    if (sqlFile) {
      formData.append('sqlFile', sqlFile);
    }
    return this.http.patch<Exercise>(`${this.apiUrl}/${id}`, formData);
  }

  deleteExercise(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
} 