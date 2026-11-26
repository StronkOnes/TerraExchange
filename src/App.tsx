import {BrowserRouter, Route, Routes} from 'react-router-dom';
import {AuthProvider} from './context/AuthContext';
import {Layout} from './components/Layout';
import {HomePage} from './pages/HomePage';
import {MarketplacePage} from './pages/MarketplacePage';
import {ListingDetailPage} from './pages/ListingDetailPage';
import {CommoditiesPage} from './pages/CommoditiesPage';
import {BusinessesDirectoryPage} from './pages/BusinessesDirectoryPage';
import {BusinessProfilePage} from './pages/BusinessProfilePage';
import {RfqsPage} from './pages/RfqsPage';
import {OpportunitiesPage} from './pages/OpportunitiesPage';
import {IntelligencePage} from './pages/IntelligencePage';
import {MessagesPage} from './pages/MessagesPage';
import {DashboardPage} from './pages/DashboardPage';
import {TradeDeskPage} from './pages/TradeDeskPage';
import {AdminPage} from './pages/AdminPage';
import {AuthPage} from './pages/AuthPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/listings/:id" element={<ListingDetailPage />} />
            <Route path="/commodities" element={<CommoditiesPage />} />
            <Route path="/suppliers" element={<BusinessesDirectoryPage role="supplier" />} />
            <Route path="/buyers" element={<BusinessesDirectoryPage role="buyer" />} />
            <Route path="/businesses/:id" element={<BusinessProfilePage />} />
            <Route path="/rfqs" element={<RfqsPage />} />
            <Route path="/opportunities" element={<OpportunitiesPage />} />
            <Route path="/intelligence" element={<IntelligencePage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/trade-desk" element={<TradeDeskPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/auth" element={<AuthPage />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthProvider>
  );
}
