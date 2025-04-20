import { Converter } from './Transition';

export const IdentityConverter: Converter<number> = {
  convertToNumber: it => it,
  convertFromNumber: it => it,
};
