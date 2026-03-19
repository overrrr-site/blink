import type { BusinessType } from '../../utils/businessTypes.js';

export interface LineEvent {
  type: string;
  message?: {
    type: string;
    text?: string;
  };
  postback?: {
    data: string;
  };
  source?: {
    userId?: string;
  };
  replyToken?: string;
}

export interface BotContext {
  storeId: number;
  ownerId: number;
  primaryBusinessType: BusinessType;
  businessTypes: BusinessType[];
}
