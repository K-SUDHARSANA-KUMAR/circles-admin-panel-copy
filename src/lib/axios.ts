import axios from 'axios';
import { attachAxiosInterceptors } from './interceptors';

const customAxios = axios.create();

attachAxiosInterceptors(customAxios);

export default customAxios;
