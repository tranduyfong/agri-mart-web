import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';

// Dùng 2 hook này thay cho useDispatch / useSelector để có gợi ý kiểu dữ liệu (TypeScript)
export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();
