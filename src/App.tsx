import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLogin from "./pages/admin/Login.tsx";
import AdminDashboard from "./pages/admin/Dashboard.tsx";
import AppVersionSettings from "./pages/admin/AppVersionSettings.tsx";
import UserList from "./pages/admin/users/UserList.tsx";
import RiderList from "./pages/admin/riders/RiderList.tsx";
import ParcelAgents from "./pages/admin/parcel-agents/AgentList.tsx";
import RideBookings from "./pages/admin/rides/RideBookings.tsx";
import TourBookings from "./pages/admin/rides/TourBookings.tsx";
import ScheduledRides from "./pages/admin/rides/ScheduledRides.tsx";
import RecurringRides from "./pages/admin/rides/RecurringRides.tsx";
import DispatchConfig from "./pages/admin/rides/DispatchConfig.tsx";
import BargainOffers from "./pages/admin/rides/BargainOffers.tsx";
import ParcelBookings from "./pages/admin/parcels/ParcelBookings.tsx";
import Restaurants from "./pages/admin/food/Restaurants.tsx";
import FoodOrders from "./pages/admin/food/FoodOrders.tsx";
import MenuItems from "./pages/admin/food/MenuItems.tsx";
import {
  Vendors, Products, ProductCategories, EcomOrders,
  RoomListings, RoomOwners, RoomInquiries, RoomRequests,
  Wallets, WalletTransactions, Payments, PaymentIntents, QRSessions, Topups, Payouts,
  VehicleTypes, SurgeRules, FareOverrides, FareEstimates, CoinRate,
  PromoCodes, PromoUsage, BirthdayPromos, Referrals, PopupAds,
  LoyaltyTiers, LoyaltyUsers, LoyaltyTransactions, Streaks, LoyaltyAchievements, TripTargets, DemandForecast,
  SendPush, NotifTemplates, PushLogs, NotifInbox,
  SupportTickets,
  AppSettings, ServiceCharges, AppVersions, QuickReplies, CancellationPolicies,
  AdminList, ActivityLogs, Analytics,
  RiderLeaderboard, RiderAchievements,
} from "./pages/admin/SimplePages.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<UserList />} />
          <Route path="/admin/riders" element={<RiderList />} />
          <Route path="/admin/riders/leaderboard" element={<RiderLeaderboard />} />
          <Route path="/admin/riders/achievements" element={<RiderAchievements />} />
          <Route path="/admin/parcel-agents" element={<ParcelAgents />} />
          <Route path="/admin/rides" element={<RideBookings />} />
          <Route path="/admin/rides/tours" element={<TourBookings />} />
          <Route path="/admin/rides/scheduled" element={<ScheduledRides />} />
          <Route path="/admin/rides/recurring" element={<RecurringRides />} />
          <Route path="/admin/rides/dispatch" element={<DispatchConfig />} />
          <Route path="/admin/rides/bargains" element={<BargainOffers />} />
          <Route path="/admin/parcels" element={<ParcelBookings />} />
          <Route path="/admin/food/restaurants" element={<Restaurants />} />
          <Route path="/admin/food/orders" element={<FoodOrders />} />
          <Route path="/admin/food/menu" element={<MenuItems />} />
          <Route path="/admin/ecommerce/vendors" element={<Vendors />} />
          <Route path="/admin/ecommerce/products" element={<Products />} />
          <Route path="/admin/ecommerce/categories" element={<ProductCategories />} />
          <Route path="/admin/ecommerce/orders" element={<EcomOrders />} />
          <Route path="/admin/rooms/listings" element={<RoomListings />} />
          <Route path="/admin/rooms/owners" element={<RoomOwners />} />
          <Route path="/admin/rooms/inquiries" element={<RoomInquiries />} />
          <Route path="/admin/rooms/requests" element={<RoomRequests />} />
          <Route path="/admin/finance/wallets" element={<Wallets />} />
          <Route path="/admin/finance/wallet-transactions" element={<WalletTransactions />} />
          <Route path="/admin/finance/payments" element={<Payments />} />
          <Route path="/admin/finance/intents" element={<PaymentIntents />} />
          <Route path="/admin/finance/qr-sessions" element={<QRSessions />} />
          <Route path="/admin/finance/topups" element={<Topups />} />
          <Route path="/admin/finance/payouts" element={<Payouts />} />
          <Route path="/admin/pricing/vehicles" element={<VehicleTypes />} />
          <Route path="/admin/pricing/surge" element={<SurgeRules />} />
          <Route path="/admin/pricing/overrides" element={<FareOverrides />} />
          <Route path="/admin/pricing/estimates" element={<FareEstimates />} />
          <Route path="/admin/pricing/coins" element={<CoinRate />} />
          <Route path="/admin/promotions/codes" element={<PromoCodes />} />
          <Route path="/admin/promotions/usage" element={<PromoUsage />} />
          <Route path="/admin/promotions/birthday" element={<BirthdayPromos />} />
          <Route path="/admin/promotions/referrals" element={<Referrals />} />
          <Route path="/admin/promotions/popup-ads" element={<PopupAds />} />
          <Route path="/admin/loyalty/tiers" element={<LoyaltyTiers />} />
          <Route path="/admin/loyalty/users" element={<LoyaltyUsers />} />
          <Route path="/admin/loyalty/transactions" element={<LoyaltyTransactions />} />
          <Route path="/admin/loyalty/streaks" element={<Streaks />} />
          <Route path="/admin/loyalty/achievements" element={<LoyaltyAchievements />} />
          <Route path="/admin/loyalty/targets" element={<TripTargets />} />
          <Route path="/admin/loyalty/demand" element={<DemandForecast />} />
          <Route path="/admin/notifications/send" element={<SendPush />} />
          <Route path="/admin/notifications/templates" element={<NotifTemplates />} />
          <Route path="/admin/notifications/logs" element={<PushLogs />} />
          <Route path="/admin/notifications/inbox" element={<NotifInbox />} />
          <Route path="/admin/support" element={<SupportTickets />} />
          <Route path="/admin/settings/app" element={<AppSettings />} />
          <Route path="/admin/settings/app-version" element={<AppVersionSettings />} />
          <Route path="/admin/settings/service-charges" element={<ServiceCharges />} />
          <Route path="/admin/settings/versions" element={<AppVersions />} />
          <Route path="/admin/settings/quick-replies" element={<QuickReplies />} />
          <Route path="/admin/settings/cancellation" element={<CancellationPolicies />} />
          <Route path="/admin/admin-users" element={<AdminList />} />
          <Route path="/admin/admin-users/activity" element={<ActivityLogs />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
