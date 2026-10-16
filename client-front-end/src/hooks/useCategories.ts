import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from './useRedux';
import { fetchCategories } from '../store/slices/categorySlice';

// Lấy danh sách danh mục từ Redux, nếu chưa tải lần nào thì tự gọi API
// Nhiều component cùng dùng hook này nhưng API chỉ được gọi 1 lần
const useCategories = () => {
  const dispatch = useAppDispatch();
  const { items, status } = useAppSelector((state) => state.category);

  useEffect(() => {
    if (status === 'idle') {
      dispatch(fetchCategories());
    }
  }, [status, dispatch]);

  return {
    categories: items,
    isLoading: status === 'idle' || status === 'loading',
  };
};

export default useCategories;
