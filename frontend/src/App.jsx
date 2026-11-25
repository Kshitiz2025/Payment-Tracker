import { useState } from 'react'; // <-- 1. Added this import
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/Layout';
import Transactions from './pages/Transactions';
import Analytics from './pages/Analytics';
import Categories from './pages/Categories';
import Settings from './pages/Settings';

export default function App() {
  // Lifted state
  const [aiTone, setAiTone] = useState('Strict Financial Advisor');
  
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        
        <Route element={<Layout />}>
          <Route path="/home" element={<Dashboard />} />
          
          {/* 2. Passed the props directly into the route elements */}
          <Route path="/transactions" element={<Transactions aiTone={aiTone} />} />
          <Route path="/analytics" element={<Analytics aiTone={aiTone} setAiTone={setAiTone} />} />
          
          <Route path="/categories" element={<Categories />} />
          <Route path="/settings" element={<Settings aiTone={aiTone} setAiTone={setAiTone} />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}