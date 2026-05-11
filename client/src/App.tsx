import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Sidebar } from './components/layout/Sidebar.tsx';
import { Main } from './components/layout/Main.tsx';
import { ChannelModal } from './components/modals/ChannelModal.tsx';
import { ToastProvider } from './components/ui/ToastProvider.tsx';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { refetchOnWindowFocus: false, retry: 1 },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="app-shell">
        <Sidebar />
        <Main />
      </div>
      <ChannelModal />
      <ToastProvider />
    </QueryClientProvider>
  );
}
