import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface LoadingState {
  [key: string]: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LoadingService {
  private loadingStates = new BehaviorSubject<LoadingState>({});

  /**
   * Set loading state for a specific key
   */
  setLoading(key: string, loading: boolean): void {
    const currentState = this.loadingStates.value;
    this.loadingStates.next({
      ...currentState,
      [key]: loading
    });
  }

  /**
   * Get loading state for a specific key
   */
  isLoading(key: string): Observable<boolean> {
    return new Observable(observer => {
      this.loadingStates.subscribe(state => {
        observer.next(!!state[key]);
      });
    });
  }

  /**
   * Get all loading states
   */
  getAllLoadingStates(): Observable<LoadingState> {
    return this.loadingStates.asObservable();
  }

  /**
   * Check if any loading is active
   */
  isAnyLoading(): Observable<boolean> {
    return new Observable(observer => {
      this.loadingStates.subscribe(state => {
        const hasLoading = Object.values(state).some(loading => loading);
        observer.next(hasLoading);
      });
    });
  }

  /**
   * Clear all loading states
   */
  clearAll(): void {
    this.loadingStates.next({});
  }

  /**
   * Remove specific loading key
   */
  remove(key: string): void {
    const currentState = this.loadingStates.value;
    const { [key]: removed, ...newState } = currentState;
    this.loadingStates.next(newState);
  }
}
