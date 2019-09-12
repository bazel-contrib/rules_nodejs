import {Action} from '@ngrx/store';

export const ADD_TODO = 'ADD_TODO';
export const DELETE_TODO = 'DELETE_TODO';
export const UPDATE_TODO = 'UPDATE_TODO';
export const TOGGLE_DONE = 'TOGGLE_DONE';

export interface ActionWithPayload<T> extends Action {
  payload: T;
}

export interface TodoPayload {
  index?: number;
  done?: boolean;
  value?: string;
  newValue?: string;
}

export function todoReducer(state = [], action: ActionWithPayload<TodoPayload>) {
  switch (action.type) {
    case ADD_TODO:
      return [action.payload, ...state];
    case DELETE_TODO:
      return state.filter((item, index) => index !== action.payload.index);
    case UPDATE_TODO:
      return state.map((item, index) => {
        return index === action.payload.index ? {...item, value: action.payload.newValue} : item;
      });
    case TOGGLE_DONE:
      return state.map((item, index) => {
        return index === action.payload.index ? {...item, done: !action.payload.done} : item;
      });
    default:
      return state;
  }
}
