import Data from '../data/data.json';
import { Input } from './types';

const main = () => {
  const data = Data as Input;
  console.log(data);
};

main();
