/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  Layout,
  LayoutDashboard, 
  Package, 
  Users, 
  ShoppingCart, 
  TrendingUp, 
  FileText, 
  Search, 
  Plus, 
  Printer, 
  Download, 
  ChevronRight,
  Menu,
  X,
  CreditCard,
  Warehouse,
  History,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Wallet,
  LayoutGrid,
  Eye,
  Trash2,
  UserCheck,
  Building2,
  MapPin,
  Phone,
  Mail,
  Percent,
  BarChart3,
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type View = 'dashboard' | 'products' | 'entities' | 'purchases' | 'sales' | 'reports' | 'stock' | 'accounts' | 'warehouses';

interface Product {
  id: string;
  name: string;
  description: string;
  unit_price: number;
  category_id?: number;
  subcategory_id?: number;
  category_name?: string;
  subcategory_name?: string;
  image_url?: string;
  is_active?: number;
}

interface Category {
  id: number;
  name: string;
  is_active: number;
}

interface Subcategory {
  id: number;
  category_id: number;
  name: string;
  is_active: number;
}

interface Entity {
  rut: string;
  name: string;
  type: 'client' | 'supplier' | 'both';
  email: string;
  address: string;
  phone: string;
  comuna?: string;
  ciudad?: string;
  is_partner?: number;
  default_discount?: number;
  person_type?: 'empresa' | 'persona';
  contact_name?: string;
  contact_phone?: string;
  contact_email?: string;
}

interface DocumentLine {
  product_id: string;
  product_name?: string;
  warehouse_id?: number;
  warehouse_name?: string;
  quantity: number;
  price: number;
  discount: number;
  total: number;
}

interface Document {
  id?: number;
  internal_number?: string;
  doc_number: string;
  doc_type: string;
  category: 'purchase' | 'sale' | 'transfer';
  date: string;
  entity_rut: string;
  entity_name?: string;
  global_discount: number;
  payment_method: string;
  total_net: number;
  total_vat: number;
  total_amount: number;
  lines: DocumentLine[];
  from_warehouse_id?: number;
  to_warehouse_id?: number;
  status?: string;
}

// --- Constants ---
const API_BASE = '/erp/api';

// --- Utils ---
const calculateExpectedDv = (rutBody: string) => {
  let sum = 0;
  let multiplier = 2;
  
  for (let i = rutBody.length - 1; i >= 0; i--) {
    sum += parseInt(rutBody[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  
  const expectedDv = 11 - (sum % 11);
  if (expectedDv === 11) return '0';
  if (expectedDv === 10) return 'K';
  return expectedDv.toString();
};

const validateRut = (rut: string) => {
  if (!rut || typeof rut !== 'string') return { isValid: false };
  
  // Clean dots and hyphens
  const cleanRut = rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
  
  if (cleanRut.length < 2) return { isValid: false };
  
  const body = cleanRut.slice(0, -1);
  const dv = cleanRut.slice(-1);
  
  if (!/^\d+$/.test(body)) return { isValid: false };
  
  const expectedDv = calculateExpectedDv(body);
  return { isValid: expectedDv === dv, expectedDv };
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}-${month}-${year}`;
};

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
      active 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
        : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Card = ({ children, className = "", ...props }: { children: React.ReactNode, className?: string, [key: string]: any }) => (
  <div className={`bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden ${className}`} {...props}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = 'primary', icon: Icon, disabled = false, className = "", type = "button" }: any) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100',
    secondary: 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50',
    danger: 'bg-red-500 text-white hover:bg-red-600 shadow-red-100',
    success: 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-100',
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center space-x-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${variants[variant as keyof typeof variants]} ${className}`}
    >
      {Icon && <Icon size={18} />}
      <span>{children}</span>
    </button>
  );
};

const Input = ({ label, value, onChange, onBlur, type = "text", placeholder, required = false, className = "" }: any) => (
  <div className={`flex flex-col space-y-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <input
      type={type}
      value={(typeof value === 'number' && isNaN(value)) ? '' : (value ?? '')}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      required={required}
      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
    />
  </div>
);

const Select = ({ label, value, onChange, options, className = "" }: any) => (
  <div className={`flex flex-col space-y-1.5 ${className}`}>
    {label && <label className="text-sm font-semibold text-slate-700">{label}</label>}
    <select
      value={(typeof value === 'number' && isNaN(value)) ? '' : (value ?? '')}
      onChange={onChange}
      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-slate-900"
    >
      {options.map((opt: any) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  </div>
);

// --- Main App ---

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('garage66_auth') === 'true';
  });
  const [loginUser, setLoginUser] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (loginUser === 'Admin' && loginPass === 'Garage*') {
      setIsAuthenticated(true);
      localStorage.setItem('garage66_auth', 'true');
      setLoginError('');
    } else {
      setLoginError('Usuario o contraseña incorrectos');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('garage66_auth');
  };

  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [manageCatType, setManageCatType] = useState<'category' | 'subcategory'>('category');
  const [selectedCatId, setSelectedCatId] = useState<number | null>(null);
  const [editingCat, setEditingCat] = useState<Category | Subcategory | null>(null);
  const [newCatName, setNewCatName] = useState('');
  const [catActiveStatus, setCatActiveStatus] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [prevModal, setPrevModal] = useState<string | null>(null);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [partnerTransactions, setPartnerTransactions] = useState<Document[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Entity | null>(null);
  const [paymentAmount, setPaymentAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('transferencia');
  const [searchTerm, setSearchTerm] = useState('');
  const [validationError, setValidationError] = useState<{ show: boolean, msg: string, expectedDv?: string | null }>({ show: false, msg: '', expectedDv: null });
  const [stockBreakdown, setStockBreakdown] = useState<any[]>([]);
  const [selectedStockProduct, setSelectedStockProduct] = useState<any>(null);
  const [kardexProduct, setKardexProduct] = useState<string | null>(null);
  const [kardexProductName, setKardexProductName] = useState<string>('');
  const [kardexData, setKardexData] = useState<any[]>([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{ show: boolean, id: number | null }>({ show: false, id: null });
  const [supervisorAuth, setSupervisorAuth] = useState<{ show: boolean, password: '', onAuthorized: () => void }>({ show: false, password: '', onAuthorized: () => {} });

  const [isEditingEntity, setIsEditingEntity] = useState(false);
  const [newWarehouseName, setNewWarehouseName] = useState('');
  const [editingWarehouse, setEditingWarehouse] = useState<any>(null);
  const [isMastersOpen, setIsMastersOpen] = useState(true);
  const [isTablesOpen, setIsTablesOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ status: 'loading' | 'ok' | 'error', message?: string }>({ status: 'loading' });

  // Form states
  const [newEntity, setNewEntity] = useState<Entity>({ 
    rut: '', name: '', type: 'client', email: '', address: '', phone: '',
    comuna: '', ciudad: '', is_partner: 0, default_discount: 0,
    person_type: 'persona', contact_name: '', contact_phone: '', contact_email: ''
  });
  const [newProduct, setNewProduct] = useState<Product>({ id: '', name: '', description: '', unit_price: 0, category_id: undefined, subcategory_id: undefined, image_url: '', is_active: 1 });
  const [newDoc, setNewDoc] = useState<Partial<Document>>({
    internal_number: '',
    doc_number: '',
    doc_type: 'factura',
    category: 'sale',
    date: new Date().toISOString().split('T')[0],
    entity_rut: '',
    global_discount: 0,
    payment_method: 'efectivo',
    lines: [],
    from_warehouse_id: 1,
    to_warehouse_id: 1
  });

  useEffect(() => {
    checkHealth();
    fetchData();
  }, [currentView]);

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/health`);
      const data = await res.json();
      if (res.ok && data.status === 'ok') {
        setDbStatus({ status: 'ok' });
      } else {
        setDbStatus({ status: 'error', message: data.message || 'Error de conexión con la base de datos' });
      }
    } catch (err) {
      setDbStatus({ status: 'error', message: 'No se pudo contactar con el servidor' });
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, eRes, wRes, cRes, sRes] = await Promise.all([
        fetch(`${API_BASE}/products`),
        fetch(`${API_BASE}/entities`),
        fetch(`${API_BASE}/warehouses`),
        fetch(`${API_BASE}/categories`),
        fetch(`${API_BASE}/subcategories`)
      ]);

      if (!pRes.ok || !eRes.ok || !wRes.ok || !cRes.ok || !sRes.ok) {
        throw new Error('Error al cargar datos maestros');
      }

      setProducts(await pRes.json());
      setEntities(await eRes.json());
      setWarehouses(await wRes.json());
      setCategories(await cRes.json());
      setSubcategories(await sRes.json());

      if (currentView === 'purchases') {
        const dRes = await fetch(`${API_BASE}/documents?category=purchase&q=${searchTerm}`);
        if (dRes.ok) setDocuments(await dRes.json());
      } else if (currentView === 'sales') {
        const dRes = await fetch(`${API_BASE}/documents?category=sale&q=${searchTerm}`);
        if (dRes.ok) setDocuments(await dRes.json());
      }
    } catch (error: any) {
      console.error("Error fetching data:", error);
      setDbStatus({ status: 'error', message: error.message || 'Error al cargar datos' });
    }
    setLoading(false);
  };

  const handleRutBlur = () => {
    if (!newEntity.rut) return;
    const rutValidation = validateRut(newEntity.rut);
    if (!rutValidation.isValid) {
      setValidationError({
        show: true,
        msg: "El RUT ingresado no es válido.",
        expectedDv: rutValidation.expectedDv || null
      });
    }
  };

  const handleDocRutBlur = () => {
    if (!newDoc.entity_rut) return;
    const rutValidation = validateRut(newDoc.entity_rut);
    if (!rutValidation.isValid) {
      setValidationError({
        show: true,
        msg: "El RUT ingresado no es válido.",
        expectedDv: rutValidation.expectedDv || null
      });
    }
  };

  const handleSaveEntity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate RUT format and DV
    const rutValidation = validateRut(newEntity.rut);
    if (!rutValidation.isValid) {
      setValidationError({
        show: true,
        msg: "El RUT ingresado no es válido.",
        expectedDv: rutValidation.expectedDv || null
      });
      return;
    }

    // New validations requested by user
    if (!newEntity.name.trim()) {
      setValidationError({ show: true, msg: 'Falta agregar el nombre del socio.' });
      return;
    }
    if (!newEntity.address.trim()) {
      setValidationError({ show: true, msg: 'Falta agregar el campo de dirección.' });
      return;
    }

    // Validate RUT uniqueness for new entities
    if (!isEditingEntity && entities.some(ent => ent.rut === newEntity.rut)) {
      setValidationError({ show: true, msg: "Error: Ya existe un socio de negocio con este RUT." });
      return;
    }
    
    const cleanRut = newEntity.rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    
    const res = await fetch(`${API_BASE}/entities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newEntity,
        rut: cleanRut,
        default_discount: (typeof newEntity.default_discount === 'number' && !isNaN(newEntity.default_discount)) ? newEntity.default_discount : 0
      })
    });
    if (res.ok) {
      if (prevModal === 'search_entity') {
        setShowModal('search_entity');
        setPrevModal(null);
      } else {
        setShowModal(null);
      }
      fetchData();
      setNewEntity({ 
        rut: '', name: '', type: 'client', email: '', address: '', phone: '',
        comuna: '', ciudad: '', is_partner: 0, default_discount: 0,
        person_type: 'persona', contact_name: '', contact_phone: '', contact_email: ''
      });
    } else {
      const err = await res.json();
      setValidationError({ show: true, msg: `Error: ${err.error || 'No se pudo guardar el socio'}` });
    }
  };

  const handleExportEntitiesExcel = () => {
    const ws = XLSX.utils.json_to_sheet(entities);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Socios");
    XLSX.writeFile(wb, "Socios_de_Negocios.xlsx");
  };

  const handleExportEntitiesPDF = () => {
    const doc = new jsPDF();
    doc.text("Socios de Negocios", 14, 15);
    const tableData = entities.map(e => [
      e.rut,
      e.name,
      e.type.toUpperCase(),
      `${e.ciudad || '-'}/${e.comuna || '-'}`,
      e.is_partner === 1 ? 'Sí' : 'No',
      `${e.default_discount}%`
    ]);
    autoTable(doc, {
      head: [['RUT', 'Nombre', 'Tipo', 'Ciudad/Comuna', 'Socio', 'Desc.']],
      body: tableData,
      startY: 20,
    });
    doc.save("Socios_de_Negocios.pdf");
  };

  const handleExportExcel = () => {
    const exportData = products.map(({ image_url, ...rest }) => ({
      ...rest,
      is_active: rest.is_active === 1 ? 'Activo' : 'Inactivo'
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Productos");
    XLSX.writeFile(wb, "Maestro_Productos.xlsx");
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();
    doc.text("Maestro de Productos", 14, 15);
    const tableData = products.map(p => [
      (p.id || '').toString().substring(0, 1000), 
      (p.name || '').toString().substring(0, 1000), 
      (p.category_name || '-').toString().substring(0, 1000), 
      (p.subcategory_name || '-').toString().substring(0, 1000), 
      `$${(p.unit_price || 0).toLocaleString()}`,
      p.is_active === 1 ? 'Activo' : 'Inactivo'
    ]);
    autoTable(doc, {
      head: [['Código', 'Nombre', 'Categoría', 'Subcategoría', 'Precio', 'Estado']],
      body: tableData,
      startY: 20,
    });
    doc.save("Maestro_Productos.pdf");
  };

  const handlePrint = () => {
    window.print();
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProduct.name) {
      setValidationError({ show: true, msg: 'Falta agregar el nombre del producto.' });
      return;
    }
    if (!newProduct.id) {
      setValidationError({ show: true, msg: 'Falta agregar el SKU/ID del producto.' });
      return;
    }
    if (newProduct.unit_price <= 0) {
      setValidationError({ show: true, msg: 'El precio unitario debe ser mayor a 0.' });
      return;
    }

    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...newProduct,
        unit_price: (typeof newProduct.unit_price === 'number' && !isNaN(newProduct.unit_price)) ? newProduct.unit_price : 0
      })
    });
    if (res.ok) {
      if (prevModal === 'search_product') {
        setShowModal('search_product');
        setPrevModal(null);
      } else {
        setShowModal(null);
      }
      fetchData();
      setNewProduct({ id: '', name: '', description: '', unit_price: 0, category_id: undefined, subcategory_id: undefined, image_url: '', is_active: 1 });
    } else {
      const err = await res.json();
      setValidationError({ show: true, msg: `Error: ${err.error || 'No se pudo guardar el producto'}` });
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este producto?')) return;
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.message) setValidationError({ show: true, msg: data.message });
    fetchData();
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewProduct({ ...newProduct, image_url: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveCategory = async () => {
    if (!newCatName.trim()) {
      setValidationError({ show: true, msg: 'El nombre es obligatorio' });
      return;
    }

    const body: any = { 
      name: newCatName.trim(), 
      is_active: Number(catActiveStatus) 
    };
    
    if (manageCatType === 'subcategory') {
      if (!selectedCatId) {
        setValidationError({ show: true, msg: 'Debe seleccionar una categoría padre' });
        return;
      }
      body.category_id = Number(selectedCatId);
    }
    
    const endpoint = manageCatType === 'category' ? `${API_BASE}/categories` : `${API_BASE}/subcategories`;
    const method = editingCat ? 'PUT' : 'POST';
    const url = editingCat ? `${endpoint}/${editingCat.id}` : endpoint;
    
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      
      if (res.ok) {
        setNewCatName('');
        setEditingCat(null);
        setCatActiveStatus(1);
        setSelectedCatId(undefined);
        fetchData();
      } else {
        const error = await res.json();
        setValidationError({ show: true, msg: `Error: ${error.error || 'No se pudo guardar'}` });
      }
    } catch (err) {
      console.error(err);
      setValidationError({ show: true, msg: 'Error de conexión al guardar' });
    }
  };

  const handleDeleteCategory = async (id: number, type: 'category' | 'subcategory') => {
    const endpoint = type === 'category' ? `${API_BASE}/categories/${id}` : `${API_BASE}/subcategories/${id}`;
    const res = await fetch(endpoint, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const handleAddLine = (prodId: string) => {
    const product = products.find(p => p.id === prodId);
    if (!product) return;
    
    const newLine: DocumentLine = {
      product_id: product.id,
      product_name: product.name,
      warehouse_id: warehouses[0]?.id || 1,
      quantity: 1,
      price: product.unit_price,
      discount: 0,
      total: product.unit_price
    };
    
    setNewDoc(prev => ({
      ...prev,
      lines: [...(prev.lines || []), newLine]
    }));
  };

  const updateLine = (index: number, field: keyof DocumentLine, value: any) => {
    const lines = [...(newDoc.lines || [])];
    const line = { ...lines[index], [field]: value };
    
    // Recalculate total with NaN protection
    const q = (typeof line.quantity === 'number' && !isNaN(line.quantity)) ? line.quantity : 0;
    const p = (typeof line.price === 'number' && !isNaN(line.price)) ? line.price : 0;
    const d = (typeof line.discount === 'number' && !isNaN(line.discount)) ? line.discount : 0;
    
    const subtotal = q * p;
    line.total = subtotal * (1 - (d / 100));
    
    lines[index] = line;
    setNewDoc(prev => ({ ...prev, lines }));
  };

  const calculateDocTotals = () => {
    const lines = newDoc.lines || [];
    const subtotal = lines.reduce((sum, l) => sum + (isNaN(l.total) ? 0 : l.total), 0);
    const gDiscount = (typeof newDoc.global_discount === 'number' && !isNaN(newDoc.global_discount)) ? newDoc.global_discount : 0;
    const discounted = subtotal * (1 - (gDiscount / 100));
    const vat = discounted * 0.19;
    const total = discounted + vat;
    return { subtotal, discounted, vat, total };
  };

  const fetchKardex = async (productId: string) => {
    const product = products.find(p => p.id === productId);
    try {
      const res = await fetch(`${API_BASE}/reports/kardex/${productId}`);
      const data = await res.json();
      if (res.ok) {
        setKardexData(Array.isArray(data) ? data : []);
        setKardexProduct(productId);
        setKardexProductName(product?.name || '');
        setShowModal('kardex');
      } else {
        setValidationError({ show: true, msg: data.error || 'Error al cargar el Kardex' });
      }
    } catch (error) {
      setValidationError({ show: true, msg: 'Error de conexión al cargar el Kardex' });
    }
  };

  const fetchStockBreakdown = async (product: any) => {
    setSelectedStockProduct(product);
    try {
      const res = await fetch(`${API_BASE}/reports/stock-breakdown/${product.product_id}`);
      const data = await res.json();
      if (res.ok) {
        setStockBreakdown(Array.isArray(data) ? data : []);
        setShowModal('stock_breakdown');
      } else {
        setValidationError({ show: true, msg: data.error || 'Error al cargar el desglose de stock' });
      }
    } catch (error) {
      setValidationError({ show: true, msg: 'Error de conexión al cargar el desglose de stock' });
    }
  };

  const fetchDocDetails = async (docId: number) => {
    const res = await fetch(`${API_BASE}/documents/${docId}`);
    const data = await res.json();
    setSelectedDoc(data);
    setShowModal('viewDoc');
  };

  const handleSavePayment = async () => {
    if (!selectedDoc) return;
    if (isNaN(paymentAmount) || paymentAmount <= 0) {
      setValidationError({ show: true, msg: "Por favor ingrese un monto válido." });
      return;
    }
    const res = await fetch(`${API_BASE}/payments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        document_id: selectedDoc.id,
        date: new Date().toISOString().split('T')[0],
        amount: paymentAmount,
        method: paymentMethod
      })
    });
    if (res.ok) {
      setShowModal(null);
      fetchData();
    } else {
      const err = await res.json();
      setValidationError({ show: true, msg: `Error: ${err.error || 'No se pudo registrar el pago'}` });
    }
  };

  const handleSaveDoc = async () => {
    // Validate RUT
    if (!newDoc.entity_rut) {
      setValidationError({ show: true, msg: "Error: Debe ingresar el RUT del socio." });
      return;
    }
    const rutValidation = validateRut(newDoc.entity_rut);
    if (!rutValidation.isValid) {
      setValidationError({
        show: true,
        msg: rutValidation.expectedDv 
          ? `Error: El RUT ingresado no es válido. El dígito verificador correcto para los números ingresados es "${rutValidation.expectedDv}".`
          : "Error: El RUT ingresado no es válido.",
        expectedDv: rutValidation.expectedDv || null
      });
      return;
    }

    if (!newDoc.entity_rut) {
      setValidationError({ show: true, msg: 'Debe seleccionar un socio de negocios.' });
      return;
    }
    if (!newDoc.lines?.length) {
      setValidationError({ show: true, msg: 'El documento debe tener al menos una línea.' });
      return;
    }
    if (!newDoc.doc_number) {
      setValidationError({ show: true, msg: 'Falta agregar el número de documento.' });
      return;
    }

    const totals = calculateDocTotals();
    const cleanRut = newDoc.entity_rut.replace(/\./g, '').replace(/-/g, '').toUpperCase();
    
    const docToSave = {
      ...newDoc,
      entity_rut: cleanRut,
      total_net: totals.discounted,
      total_vat: totals.vat,
      total_amount: totals.total
    };

    const method = newDoc.id ? 'PUT' : 'POST';
    const url = newDoc.id ? `${API_BASE}/documents/${newDoc.id}` : `${API_BASE}/documents`;

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...docToSave,
        supervisorAuthorized: supervisorAuth.password === '1234' // Simple supervisor password for demo
      })
    });

    if (res.ok) {
      setShowModal(null);
      setSupervisorAuth({ show: false, password: '', onAuthorized: () => {} });
      fetchData();
      setNewDoc({
        internal_number: '',
        doc_number: '',
        doc_type: 'factura',
        category: newDoc.category,
        date: new Date().toISOString().split('T')[0],
        entity_rut: '',
        global_discount: 0,
        payment_method: 'efectivo',
        lines: [],
        from_warehouse_id: 1,
        to_warehouse_id: 1
      });
    } else {
      const err = await res.json();
      if (err.error?.includes('Stock insuficiente') && !supervisorAuth.show) {
        setSupervisorAuth({
          show: true,
          password: '',
          onAuthorized: () => handleSaveDoc()
        });
      } else {
        setValidationError({ show: true, msg: `Error: ${err.error || 'No se pudo guardar el documento'}` });
      }
    }
  };

  const handleDeleteDoc = async (id: number) => {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    if (res.ok) {
      fetchData();
      setShowDeleteConfirm({ show: false, id: null });
    } else {
      const err = await res.json();
      setValidationError({ show: true, msg: `Error: ${err.error || 'No se pudo eliminar el documento'}` });
    }
  };

  const renderDashboard = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {[
        { label: 'Ventas del Mes', value: '$2.450.000', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        { label: 'Compras del Mes', value: '$1.120.000', icon: ShoppingCart, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { label: 'Stock Bajo', value: '12 Items', icon: Package, color: 'text-amber-600', bg: 'bg-amber-50' },
        { label: 'Cuentas x Cobrar', value: '$840.000', icon: CreditCard, color: 'text-rose-600', bg: 'bg-rose-50' },
      ].map((stat, i) => (
        <Card key={i} className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
            </div>
            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
              <stat.icon size={24} />
            </div>
          </div>
        </Card>
      ))}
      
      <Card className="col-span-full lg:col-span-2 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Últimos Movimientos</h3>
        <div className="space-y-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-900">Factura #102{i}</p>
                  <p className="text-xs text-slate-500">Cliente: Juan Perez</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-slate-900">$45.000</p>
                <p className="text-xs text-emerald-600">Pagado</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="col-span-full lg:col-span-2 p-6">
        <h3 className="text-lg font-bold text-slate-900 mb-4">Stock Crítico</h3>
        <div className="space-y-4">
          {products.slice(0, 4).map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
                  <Package size={18} />
                </div>
                <div>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">Bodega Central</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-rose-600">5 Unid.</p>
                <p className="text-xs text-slate-400">Min: 10</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );

  const renderMasterTable = (type: 'products' | 'entities') => {
    const data = type === 'products' ? products : entities;
    const title = type === 'products' ? 'Maestro de Productos' : 'Socios de Negocios';
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <div className="flex space-x-3">
            <Button icon={Download} variant="secondary" onClick={type === 'products' ? handleExportPDF : handleExportEntitiesPDF}>Exportar PDF</Button>
            <Button icon={FileText} variant="secondary" onClick={type === 'products' ? handleExportExcel : handleExportEntitiesExcel}>Exportar Excel</Button>
            <Button icon={Plus} onClick={() => {
              if (type === 'products') {
                const maxId = products.reduce((max, p) => {
                  const idNum = parseInt(p.id);
                  return isNaN(idNum) ? max : Math.max(max, idNum);
                }, 0);
                const nextSku = (maxId + 1).toString().padStart(4, '0');
                setNewProduct({ id: nextSku, name: '', description: '', unit_price: 0, category_id: undefined, subcategory_id: undefined, image_url: '', is_active: 1 });
              } else {
                setNewEntity({ 
                  rut: '', name: '', type: 'client', email: '', address: '', phone: '',
                  comuna: '', ciudad: '', is_partner: 0, default_discount: 0,
                  person_type: 'persona', contact_name: '', contact_phone: '', contact_email: ''
                });
                setIsEditingEntity(false);
              }
              setShowModal(type);
            }}>Nuevo {type === 'products' ? 'Producto' : 'Socio'}</Button>
          </div>
        </div>
        
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {type === 'products' ? (
                    <>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Imagen</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Código</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Nombre</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Categoría</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Subcategoría</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Precio Base</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Estado</th>
                    </>
                  ) : (
                    <>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">RUT</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Nombre</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Tipo</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Ciudad/Comuna</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Socio</th>
                      <th className="px-6 py-4 text-sm font-semibold text-slate-700">Desc.</th>
                    </>
                  )}
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((item: any, i) => (
                  <tr key={i} className={`hover:bg-slate-50 transition-colors ${item.is_active === 0 ? 'opacity-50' : ''}`}>
                    {type === 'products' ? (
                      <>
                        <td className="px-6 py-4">
                          {item.image_url ? (
                            <img 
                              src={item.image_url} 
                              alt={item.name} 
                              className="w-10 h-10 object-cover rounded-lg cursor-zoom-in" 
                              referrerPolicy="no-referrer" 
                              onClick={() => setZoomedImage(item.image_url)}
                            />
                          ) : (
                            <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                              <Package size={20} />
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm font-mono text-indigo-600">{item.id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{item.category_name || '-'}</td>
                        <td className="px-6 py-4 text-sm text-slate-500">{item.subcategory_name || '-'}</td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">${item.unit_price.toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.is_active === 0 ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                            {item.is_active === 0 ? 'INACTIVO' : 'ACTIVO'}
                          </span>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 text-sm font-mono text-slate-600">{item.rut}</td>
                        <td className="px-6 py-4 text-sm font-medium text-slate-900">{item.name}</td>
                        <td className="px-6 py-4 text-sm">
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                            item.type === 'client' ? 'bg-emerald-100 text-emerald-700' : 
                            item.type === 'supplier' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.type.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-slate-500">{item.ciudad || '-'}/{item.comuna || '-'}</td>
                        <td className="px-6 py-4 text-sm">
                          {item.is_partner === 1 ? <UserCheck className="text-emerald-500" size={18} /> : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-slate-900">{item.default_discount}%</td>
                      </>
                    )}
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <button 
                        onClick={async () => {
                          if (type === 'products') {
                            setNewProduct({ ...item });
                            setShowModal('products');
                          } else {
                            setNewEntity({ ...item });
                            setIsEditingEntity(true);
                            setShowModal('entities');
                          }
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Editar
                      </button>
                      {type === 'entities' && (
                        <button 
                          onClick={async () => {
                            const res = await fetch(`${API_BASE}/entities/${item.rut}/transactions`);
                            setPartnerTransactions(await res.json());
                            setSelectedPartner(item);
                            setShowModal('partner_transactions');
                          }}
                          className="text-emerald-600 hover:text-emerald-800 font-medium"
                        >
                          Transacciones
                        </button>
                      )}
                      {type === 'products' && (
                        <button 
                          onClick={() => handleDeleteProduct(item.id)}
                          className="text-rose-600 hover:text-rose-800 font-medium"
                        >
                          Eliminar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const renderCategories = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Maestro de Categorías</h2>
        <div className="flex space-x-3">
          <Button icon={Plus} variant="secondary" onClick={() => {
            setManageCatType('subcategory');
            setEditingCat(null);
            setNewCatName('');
            setCatActiveStatus(1);
            setShowModal('manage_categories');
          }}>Nueva Subcategoría</Button>
          <Button icon={Plus} onClick={() => {
            setManageCatType('category');
            setEditingCat(null);
            setNewCatName('');
            setCatActiveStatus(1);
            setShowModal('manage_categories');
          }}>Nueva Categoría</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-700">Categorías</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Estado</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map(cat => (
                  <tr key={cat.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{cat.name}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${cat.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {cat.is_active ? 'ACTIVO' : 'INACTIVO'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <button 
                        onClick={() => {
                          setManageCatType('category');
                          setEditingCat(cat);
                          setNewCatName(cat.name);
                          setCatActiveStatus(cat.is_active ? 1 : 0);
                          setShowModal('manage_categories');
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="font-bold text-slate-700">Subcategorías</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Nombre</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase">Categoría Padre</th>
                  <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {subcategories.map(sub => (
                  <tr key={sub.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{sub.name}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {categories.find(c => c.id === sub.category_id)?.name || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <button 
                        onClick={() => {
                          setManageCatType('subcategory');
                          setEditingCat(sub);
                          setNewCatName(sub.name);
                          setSelectedCatId(sub.category_id);
                          setCatActiveStatus(sub.is_active ? 1 : 0);
                          setShowModal('manage_categories');
                        }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );

  const renderWarehouses = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Maestro de Bodegas</h2>
        <Button icon={Plus} onClick={() => {
          setEditingWarehouse(null);
          setNewWarehouseName('');
          setShowModal('warehouse');
        }}>Nueva Bodega</Button>
      </div>
      
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">ID</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700">Nombre</th>
                <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {warehouses.map((w) => (
                <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">{w.id}</td>
                  <td className="px-6 py-4 text-sm font-medium text-slate-900">{w.name}</td>
                  <td className="px-6 py-4 text-sm text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => {
                          setEditingWarehouse(w);
                          setNewWarehouseName(w.name);
                          setShowModal('warehouse');
                        }}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                      >
                        <Eye size={18} />
                      </button>
                      <button 
                        onClick={async () => {
                          if (!confirm('¿Está seguro de eliminar esta bodega?')) return;
                          const res = await fetch(`${API_BASE}/warehouses/${w.id}`, { method: 'DELETE' });
                          if (res.ok) {
                            fetchData();
                          } else {
                            const err = await res.json();
                            setValidationError({ show: true, msg: err.error || 'No se pudo eliminar la bodega' });
                          }
                        }}
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );

  const renderDocumentView = (category: 'purchase' | 'sale') => {
    const title = category === 'purchase' ? 'Compras de Existencias' : 'Ventas de Existencias';
    const entityLabel = category === 'purchase' ? 'Proveedor' : 'Cliente';
    
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
          <div className="flex space-x-3">
            <Button icon={Search} variant="secondary">Buscar</Button>
            <Button icon={Plus} onClick={async () => {
              const res = await fetch(`${API_BASE}/documents/next-number?category=${category}`);
              const { next } = await res.json();
              setNewDoc(prev => ({ ...prev, category, internal_number: next, doc_number: '' }));
              setShowModal('document');
            }}>Nuevo Documento</Button>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Fecha</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Interno</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">NumDoc</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Tipo</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">{entityLabel}</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Total</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Estado</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(doc.date)}</td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-indigo-600">{doc.internal_number}</td>
                    <td className="px-6 py-4 text-sm font-mono text-slate-600">{doc.doc_number}</td>
                    <td className="px-6 py-4 text-sm text-slate-600 capitalize">{doc.doc_type.replace('_', ' ')}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{doc.entity_name}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">${doc.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        doc.status === 'paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.status?.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-right space-x-2">
                      <button onClick={() => fetchDocDetails(doc.id!)} className="text-slate-400 hover:text-indigo-600"><FileText size={18} /></button>
                      <button onClick={handlePrint} className="text-slate-400 hover:text-indigo-600"><Printer size={18} /></button>
                      <button 
                        onClick={() => setShowDeleteConfirm({ show: true, id: doc.id! })} 
                        className="text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const StockReport = ({ fetchKardex, fetchStockBreakdown, handlePrint }: { fetchKardex: (id: string) => void, fetchStockBreakdown: (product: any) => void, handlePrint: () => void }) => {
    const [stockData, setStockData] = useState<any[]>([]);
    const [showZeroStock, setShowZeroStock] = useState(false);
    
    useEffect(() => {
      fetch(`${API_BASE}/reports/stock`).then(r => r.json()).then(setStockData);
    }, []);

    const exportToExcel = () => {
      const data = stockData
        .filter(s => showZeroStock || (s.incomes - s.expenses) > 0)
        .map(s => ({
          'Código': s.product_id,
          'Producto': s.product_name,
          'Saldo Actual': s.incomes - s.expenses,
          'Precio Compra Promedio': s.avg_purchase_price || 0
        }));
      
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Stock Actual");
      XLSX.writeFile(wb, "stock_actual.xlsx");
    };

    const filteredStock = stockData.filter(s => showZeroStock || (s.incomes - s.expenses) > 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Stock Actual de Productos (Global)</h2>
          <div className="flex space-x-3">
            <Button 
              variant="secondary" 
              onClick={() => setShowZeroStock(!showZeroStock)}
              className={showZeroStock ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : ''}
            >
              {showZeroStock ? 'Ocultar Stock Cero/Negativo' : 'Mostrar Stock Cero/Negativo'}
            </Button>
            <Button icon={Download} variant="secondary" onClick={exportToExcel}>Exportar Excel</Button>
            <Button icon={Printer} variant="secondary" onClick={handlePrint}>Imprimir</Button>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Código</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Producto</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Saldo Actual</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Costo Promedio</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStock.map((s, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-mono text-indigo-600">{s.product_id}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{s.product_name}</td>
                    <td className={`px-6 py-4 text-sm text-right font-bold ${(s.incomes - s.expenses) <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                      {s.incomes - s.expenses}
                    </td>
                    <td className="px-6 py-4 text-sm text-right text-slate-600">
                      ${(s.avg_purchase_price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-sm text-right">
                      <div className="flex items-center justify-end space-x-3">
                        <button 
                          onClick={() => fetchStockBreakdown(s)} 
                          className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                          title="Ver por Bodega"
                        >
                          <Layout size={14} />
                          <span>Bodegas</span>
                        </button>
                        <button 
                          onClick={() => fetchKardex(s.product_id)} 
                          className="text-slate-600 hover:text-indigo-800 font-medium flex items-center space-x-1"
                          title="Ver Kardex"
                        >
                          <History size={14} />
                          <span>Kardex</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  const AccountsReport = ({ setSelectedDoc, setPaymentAmount, setShowModal }: { setSelectedDoc: any, setPaymentAmount: any, setShowModal: any }) => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [type, setType] = useState<'client' | 'supplier'>('client');

    useEffect(() => {
      fetch(`${API_BASE}/reports/accounts?type=${type}`).then(r => r.json()).then(setAccounts);
    }, [type]);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">
            {type === 'client' ? 'Cuentas por Cobrar' : 'Cuentas por Pagar'}
          </h2>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <button 
              onClick={() => setType('client')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${type === 'client' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Clientes
            </button>
            <button 
              onClick={() => setType('supplier')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${type === 'supplier' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Proveedores
            </button>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Fecha</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">Documento</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700">{type === 'client' ? 'Cliente' : 'Proveedor'}</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Total</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Pagado</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Saldo</th>
                  <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {accounts.map((acc, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(acc.date)}</td>
                    <td className="px-6 py-4 text-sm font-mono text-indigo-600">{acc.doc_number}</td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900">{acc.entity_name}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900 text-right">${acc.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-emerald-600 text-right">${acc.paid_amount.toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-rose-600 font-bold text-right">${(acc.total_amount - acc.paid_amount).toLocaleString()}</td>
                    <td className="px-6 py-4 text-sm text-right">
                      <Button 
                        variant="success" 
                        className="px-3 py-1 text-xs"
                        onClick={() => { setSelectedDoc(acc); setPaymentAmount(acc.total_amount - acc.paid_amount); setShowModal('payment'); }}
                      >
                        Pagar
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <>
      {!isAuthenticated ? (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="flex flex-col items-center mb-8">
              <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-500/20 mb-4">
                <Layout size={32} className="text-white" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900">Garage66 ERP</h1>
              <p className="text-slate-500">Ingrese sus credenciales</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Usuario</label>
                <input 
                  type="text" 
                  value={loginUser}
                  onChange={(e) => setLoginUser(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="Admin"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Contraseña</label>
                <input 
                  type="password" 
                  value={loginPass}
                  onChange={(e) => setLoginPass(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              
              {loginError && (
                <div className="flex items-center space-x-2 text-rose-600 bg-rose-50 p-3 rounded-xl text-sm">
                  <AlertCircle size={16} />
                  <span>{loginError}</span>
                </div>
              )}

              <button 
                type="submit"
                className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-all active:scale-[0.98]"
              >
                Iniciar Sesión
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className={`bg-slate-900 text-white transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} hidden md:flex flex-col h-screen sticky top-0`}>
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <Warehouse size={24} className="text-white" />
          </div>
          {isSidebarOpen && <h1 className="text-xl font-bold tracking-tight truncate">Garage 66</h1>}
        </div>
        
        <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
          <div className="pb-4">
            <div className={`px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between cursor-pointer hover:text-slate-700 ${!isSidebarOpen && 'hidden'}`} onClick={() => setIsMastersOpen(!isMastersOpen)}>
              <span>Maestros</span>
              <ChevronRight size={14} className={`transition-transform ${isMastersOpen ? 'rotate-90' : ''}`} />
            </div>
            {isMastersOpen && (
              <div className="space-y-1">
                <SidebarItem icon={LayoutDashboard} label="Dashboard" active={currentView === 'dashboard'} onClick={() => setCurrentView('dashboard')} />
                <SidebarItem icon={Package} label="Productos" active={currentView === 'products'} onClick={() => setCurrentView('products')} />
                <SidebarItem icon={Users} label="Socios de Negocios" active={currentView === 'entities'} onClick={() => setCurrentView('entities')} />
                
                <div className={`flex items-center justify-between px-4 py-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 rounded-lg cursor-pointer ${!isSidebarOpen && 'hidden'}`} onClick={() => setIsTablesOpen(!isTablesOpen)}>
                  <div className="flex items-center space-x-3">
                    <LayoutGrid size={18} />
                    <span>Tablas</span>
                  </div>
                  <ChevronRight size={14} className={`transition-transform ${isTablesOpen ? 'rotate-90' : ''}`} />
                </div>
                
                {isTablesOpen && isSidebarOpen && (
                  <div className="pl-8 space-y-1">
                    <SidebarItem icon={Warehouse} label="Bodegas" active={currentView === 'warehouses'} onClick={() => setCurrentView('warehouses')} />
                    <SidebarItem icon={LayoutGrid} label="Categorías" active={currentView === 'categories_view'} onClick={() => setCurrentView('categories_view')} />
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="pb-4">
            <p className={`px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ${!isSidebarOpen && 'hidden'}`}>Operaciones</p>
            <SidebarItem icon={ShoppingCart} label="Compras" active={currentView === 'purchases'} onClick={() => setCurrentView('purchases')} />
            <SidebarItem icon={TrendingUp} label="Ventas" active={currentView === 'sales'} onClick={() => setCurrentView('sales')} />
          </div>

          <div className="pb-4">
            <p className={`px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 ${!isSidebarOpen && 'hidden'}`}>Reportes</p>
            <SidebarItem icon={BarChart3} label="Stock Actual" active={currentView === 'stock'} onClick={() => setCurrentView('stock')} />
            <SidebarItem icon={History} label="Kardex" active={currentView === 'kardex_view'} onClick={() => setCurrentView('kardex_view')} />
            <SidebarItem icon={Wallet} label="Cuentas Corrientes" active={currentView === 'accounts'} onClick={() => setCurrentView('accounts')} />
          </div>
        </nav>

        {/* Database Status Indicator */}
        <div className="p-4 border-t border-slate-800">
          <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium ${
            dbStatus.status === 'ok' ? 'bg-emerald-500/10 text-emerald-400' : 
            dbStatus.status === 'loading' ? 'bg-slate-800 text-slate-400' : 
            'bg-rose-500/10 text-rose-400'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              dbStatus.status === 'ok' ? 'bg-emerald-500 animate-pulse' : 
              dbStatus.status === 'loading' ? 'bg-slate-500 animate-pulse' : 
              'bg-rose-500'
            }`} />
            <span className={`truncate ${!isSidebarOpen && 'hidden'}`}>
              {dbStatus.status === 'ok' ? 'Base de datos conectada' : 
               dbStatus.status === 'loading' ? 'Conectando...' : 
               dbStatus.message || 'Error de conexión'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-10">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="text-slate-500 hover:text-slate-900">
            <Menu size={24} />
          </button>
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchData()}
                className="pl-10 pr-4 py-2 bg-slate-100 border-transparent rounded-lg focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all w-64 text-sm"
              />
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                AD
              </div>
              <button 
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                title="Cerrar Sesión"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </header>

        <div className="p-8 overflow-y-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentView}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentView === 'dashboard' && renderDashboard()}
              {currentView === 'products' && renderMasterTable('products')}
              {currentView === 'entities' && renderMasterTable('entities')}
              {currentView === 'warehouses' && renderWarehouses()}
              {currentView === 'categories_view' && renderCategories()}
              {currentView === 'purchases' && renderDocumentView('purchase')}
              {currentView === 'sales' && renderDocumentView('sale')}
              {currentView === 'stock' && <StockReport fetchKardex={fetchKardex} fetchStockBreakdown={fetchStockBreakdown} handlePrint={handlePrint} />}
              {currentView === 'kardex_view' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-slate-900">Consulta de Kardex</h2>
                  </div>
                  <Card className="p-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="text-sm font-semibold text-slate-700 block mb-1">Seleccionar Producto</label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                          <input 
                            type="text" 
                            placeholder="Buscar producto por nombre o código..." 
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                            onChange={(e) => setSearchQuery(e.target.value)}
                            value={searchQuery}
                          />
                        </div>
                        {searchQuery && (
                          <div className="absolute z-20 mt-1 w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                            {products
                              .filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.id.toLowerCase().includes(searchQuery.toLowerCase()))
                              .map(p => (
                                <button 
                                  key={p.id}
                                  onClick={() => {
                                    fetchKardex(p.id);
                                    setSearchQuery('');
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-slate-50 flex items-center justify-between border-b border-slate-100 last:border-0"
                                >
                                  <div>
                                    <p className="font-medium text-slate-900">{p.name}</p>
                                    <p className="text-xs text-slate-500 font-mono">{p.id}</p>
                                  </div>
                                  <ChevronRight size={16} className="text-slate-400" />
                                </button>
                              ))
                            }
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>
                  
                  {kardexProduct && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-slate-800">Historial: {kardexProductName} ({kardexProduct})</h3>
                        <Button variant="secondary" icon={Printer} onClick={handlePrint}>Imprimir Kardex</Button>
                      </div>
                      <Card>
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Bodega</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Interno</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">NumDoc</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Socio</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Mov.</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Saldo</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Costo Prom.</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(() => {
                              let balance = 0;
                              return (kardexData || []).map((k, i) => {
                                balance += k.movement;
                                return (
                                  <tr key={i} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 text-sm">{formatDate(k.date)}</td>
                                    <td className="px-4 py-3 text-sm">{k.warehouse_name}</td>
                                    <td className="px-4 py-3 text-sm capitalize">{k.doc_type.replace('_', ' ')}</td>
                                    <td className="px-4 py-3 text-sm font-mono font-bold text-indigo-600">{k.internal_number}</td>
                                    <td className="px-4 py-3 text-sm font-mono text-slate-600">{k.doc_number}</td>
                                    <td className="px-4 py-3 text-sm">{k.entity_name || '-'}</td>
                                    <td className={`px-4 py-3 text-sm font-bold text-right ${k.movement > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                      {k.movement > 0 ? '+' : ''}{k.movement}
                                    </td>
                                    <td className="px-4 py-3 text-sm font-bold text-right">{balance}</td>
                                    <td className="px-4 py-3 text-sm text-right text-indigo-600">${k.avg_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                                  </tr>
                                );
                              });
                            })()}
                          </tbody>
                        </table>
                      </Card>
                    </div>
                  )}
                </div>
              )}
              {currentView === 'accounts' && <AccountsReport setSelectedDoc={setSelectedDoc} setPaymentAmount={setPaymentAmount} setShowModal={setShowModal} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modals */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          >
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-xl font-bold text-slate-900">
                {showModal === 'products' && 'Gestión de Producto'}
                {showModal === 'entities' && 'Gestión de Socio de Negocio'}
                {showModal === 'warehouse' && 'Gestión de Bodega'}
                {showModal === 'document' && `Nuevo Documento de ${newDoc.category === 'sale' ? 'Venta' : 'Compra'}`}
                {showModal === 'kardex' && `Kardex de Producto: ${kardexProduct} - ${kardexProductName}`}
                {showModal === 'viewDoc' && `Documento ${selectedDoc?.doc_number}`}
                {showModal === 'payment' && `Registrar Pago: ${selectedDoc?.doc_number}`}
                {showModal === 'manage_categories' && 'Gestionar Categorías y Subcategorías'}
                {showModal === 'partner_transactions' && `Transacciones: ${selectedPartner?.name}`}
              </h3>
              <button onClick={() => setShowModal(null)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto">
              {showModal === 'products' && (
                <form onSubmit={handleSaveProduct} className="grid grid-cols-2 gap-6">
                  <div className="col-span-1 space-y-4">
                    <Input label="Código SKU" value={newProduct.id} onChange={(e:any) => setNewProduct({...newProduct, id: e.target.value})} required />
                    <Input label="Nombre" value={newProduct.name} onChange={(e:any) => setNewProduct({...newProduct, name: e.target.value})} required />
                    <Input label="Precio Base (Neto)" type="number" value={newProduct.unit_price} onChange={(e:any) => setNewProduct({...newProduct, unit_price: parseFloat(e.target.value)})} required />
                    
                    <div className="flex flex-col space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-semibold text-slate-700">Categoría</label>
                        <button type="button" onClick={() => setShowModal('manage_categories')} className="text-xs text-indigo-600 hover:underline">Gestionar</button>
                      </div>
                      <select 
                        value={newProduct.category_id || ''} 
                        onChange={(e) => setNewProduct({...newProduct, category_id: parseInt(e.target.value), subcategory_id: undefined})}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                      >
                        <option value="">Seleccionar...</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      </select>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Subcategoría</label>
                      <select 
                        value={newProduct.subcategory_id || ''} 
                        onChange={(e) => setNewProduct({...newProduct, subcategory_id: parseInt(e.target.value)})}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                        disabled={!newProduct.category_id}
                      >
                        <option value="">Seleccionar...</option>
                        {subcategories.filter(s => s.category_id === newProduct.category_id).map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>

                    <Select label="Estado" value={newProduct.is_active} onChange={(e:any) => setNewProduct({...newProduct, is_active: parseInt(e.target.value)})} options={[
                      { value: 1, label: 'Activo' },
                      { value: 0, label: 'Inactivo' }
                    ]} />
                  </div>

                  <div className="col-span-1 space-y-4">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Imagen del Producto</label>
                      <div className="border-2 border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center space-y-3 bg-slate-50 h-48 relative overflow-hidden">
                        {newProduct.image_url ? (
                          <>
                            <img src={newProduct.image_url} alt="Preview" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
                            <button 
                              type="button" 
                              onClick={() => setNewProduct({...newProduct, image_url: ''})}
                              className="absolute top-2 right-2 p-1 bg-white/80 rounded-full text-rose-600 hover:bg-white"
                            >
                              <X size={16} />
                            </button>
                          </>
                        ) : (
                          <>
                            <Package size={40} className="text-slate-300" />
                            <p className="text-xs text-slate-500">Subir foto del producto</p>
                            <input type="file" accept="image/*" onChange={handleImageUpload} className="absolute inset-0 opacity-0 cursor-pointer" />
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Descripción</label>
                      <textarea 
                        value={newProduct.description ?? ''}
                        onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-32"
                      />
                    </div>
                  </div>

                  <div className="col-span-2 flex justify-end space-x-3 mt-4">
                    <Button variant="secondary" onClick={() => setShowModal(null)}>Cancelar</Button>
                    <Button type="submit">Guardar Producto</Button>
                  </div>
                </form>
              )}

              {showModal === 'entities' && (
                <form onSubmit={handleSaveEntity} className="grid grid-cols-2 gap-6">
                  <div className="col-span-1 space-y-4">
                    <Input 
                      label="RUT" 
                      value={newEntity.rut} 
                      onChange={(e:any) => setNewEntity({...newEntity, rut: e.target.value})} 
                      onBlur={handleRutBlur}
                      required 
                    />
                    <Input label="Nombre / Razón Social" value={newEntity.name} onChange={(e:any) => setNewEntity({...newEntity, name: e.target.value})} required />
                    <Select label="Tipo de Socio" value={newEntity.type} onChange={(e:any) => setNewEntity({...newEntity, type: e.target.value})} options={[
                      { value: 'client', label: 'Cliente' },
                      { value: 'supplier', label: 'Proveedor' },
                      { value: 'both', label: 'Ambos' }
                    ]} />
                    <Input label="Dirección" value={newEntity.address} onChange={(e:any) => setNewEntity({...newEntity, address: e.target.value})} />
                    <Input label="Comuna" value={newEntity.comuna} onChange={(e:any) => setNewEntity({...newEntity, comuna: e.target.value})} />
                    <Input label="Ciudad" value={newEntity.ciudad} onChange={(e:any) => setNewEntity({...newEntity, ciudad: e.target.value})} />
                  </div>

                  <div className="col-span-1 space-y-4">
                    <Input label="Teléfono General" value={newEntity.phone} onChange={(e:any) => setNewEntity({...newEntity, phone: e.target.value})} />
                    <Input label="Email General" type="email" value={newEntity.email} onChange={(e:any) => setNewEntity({...newEntity, email: e.target.value})} />
                    <Select label="Membresía" value={newEntity.is_partner} onChange={(e:any) => setNewEntity({...newEntity, is_partner: parseInt(e.target.value)})} options={[
                      { value: 0, label: 'No' },
                      { value: 1, label: 'Sí' }
                    ]} />
                    <Select label="Tipo de Persona" value={newEntity.person_type} onChange={(e:any) => setNewEntity({...newEntity, person_type: e.target.value})} options={[
                      { value: 'persona', label: 'Persona Natural' },
                      { value: 'empresa', label: 'Empresa' }
                    ]} />
                    <Input label="Descuento General (%)" type="number" value={newEntity.default_discount} onChange={(e:any) => setNewEntity({...newEntity, default_discount: parseFloat(e.target.value)})} />
                  </div>

                  {newEntity.person_type === 'empresa' && (
                    <div className="col-span-2 grid grid-cols-3 gap-4 p-4 bg-indigo-50 rounded-xl border border-indigo-100 mt-2">
                      <h4 className="col-span-3 text-sm font-bold text-indigo-900 flex items-center space-x-2">
                        <Building2 size={16} />
                        <span>Datos de Contacto (Empresa)</span>
                      </h4>
                      <Input label="Nombre Contacto" value={newEntity.contact_name} onChange={(e:any) => setNewEntity({...newEntity, contact_name: e.target.value})} />
                      <Input label="Teléfono Contacto" value={newEntity.contact_phone} onChange={(e:any) => setNewEntity({...newEntity, contact_phone: e.target.value})} />
                      <Input label="Email Contacto" type="email" value={newEntity.contact_email} onChange={(e:any) => setNewEntity({...newEntity, contact_email: e.target.value})} />
                    </div>
                  )}

                  <div className="col-span-2 flex justify-end space-x-3 mt-4">
                    <Button variant="secondary" onClick={() => setShowModal(null)}>Cancelar</Button>
                    <Button type="submit">Guardar Socio</Button>
                  </div>
                </form>
              )}

              {showModal === 'warehouse' && (
                <div className="space-y-4">
                  <Input 
                    label="Nombre de la Bodega" 
                    value={newWarehouseName} 
                    onChange={(e: any) => setNewWarehouseName(e.target.value)} 
                    placeholder="Ej: Bodega Central"
                  />
                  <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={() => setShowModal(null)}>Cancelar</Button>
                    <Button onClick={async () => {
                      if (!newWarehouseName.trim()) {
                        setValidationError({ show: true, msg: 'Falta agregar el nombre de la bodega.' });
                        return;
                      }
                      const method = editingWarehouse ? 'PUT' : 'POST';
                      const url = editingWarehouse ? `${API_BASE}/warehouses/${editingWarehouse.id}` : `${API_BASE}/warehouses`;
                      const res = await fetch(url, {
                        method,
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: newWarehouseName.trim() })
                      });
                      if (res.ok) {
                        setShowModal(null);
                        fetchData();
                      } else {
                        const err = await res.json();
                        setValidationError({ show: true, msg: err.error || 'Error al guardar la bodega.' });
                      }
                    }}>Guardar</Button>
                  </div>
                </div>
              )}

              {showModal === 'document' && (
                <div className="space-y-8">
                  {/* Header */}
                  <div className="grid grid-cols-3 gap-6 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">Interno</label>
                      <div className="px-3 py-2 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 font-mono">
                        {newDoc.internal_number || '---'}
                      </div>
                    </div>
                    <Input label="NumDoc" type="number" value={newDoc.doc_number} onChange={(e:any) => setNewDoc({...newDoc, doc_number: e.target.value})} required />
                    <Input label="Fecha" type="date" value={newDoc.date} onChange={(e:any) => setNewDoc({...newDoc, date: e.target.value})} required />
                    <Select label="Tipo Documento" value={newDoc.doc_type} onChange={(e:any) => setNewDoc({...newDoc, doc_type: e.target.value})} options={[
                      { value: 'factura', label: 'Factura' },
                      { value: 'boleta', label: 'Boleta' },
                      { value: 'guia', label: 'Guía de Despacho' },
                      { value: 'nota_credito', label: 'Nota de Crédito' }
                    ]} />
                    <div className="flex flex-col space-y-1.5">
                      <label className="text-sm font-semibold text-slate-700">{newDoc.category === 'sale' ? 'Cliente' : 'Proveedor'}</label>
                      <div className="flex space-x-2">
                        <input 
                          type="text"
                          value={newDoc.entity_rut ?? ''} 
                          onChange={(e) => {
                            const rut = e.target.value;
                            const entity = entities.find(ent => ent.rut === rut);
                            setNewDoc(prev => ({
                              ...prev, 
                              entity_rut: rut,
                              global_discount: entity?.default_discount || 0
                            }));
                          }}
                          onBlur={handleDocRutBlur}
                          placeholder="RUT del Socio"
                          className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg outline-none"
                        />
                        <button 
                          type="button"
                          onClick={() => {
                            setSearchQuery('');
                            setPrevModal('document');
                            setShowModal('search_entity');
                          }}
                          className="p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200"
                        >
                          <Search size={20} />
                        </button>
                      </div>
                      {newDoc.entity_rut && (
                        <div className="text-xs text-slate-500 mt-1">
                          {entities.find(e => e.rut === newDoc.entity_rut)?.name || 'Socio no encontrado'}
                        </div>
                      )}
                    </div>
                    <Select label="Método de Pago" value={newDoc.payment_method ?? ''} onChange={(e:any) => setNewDoc({...newDoc, payment_method: e.target.value})} options={[
                      { value: 'efectivo', label: 'Efectivo' },
                      { value: 'transferencia', label: 'Transferencia' },
                      { value: 'tarjeta', label: 'Tarjeta' },
                      { value: 'cheque', label: 'Cheque' },
                      { value: 'credito', label: 'Crédito Simple' }
                    ]} />
                    <Input label="Descuento Global %" type="number" value={newDoc.global_discount ?? 0} onChange={(e:any) => setNewDoc({...newDoc, global_discount: parseFloat(e.target.value)})} />
                  </div>

                  {/* Lines */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900">Detalle de Productos</h4>
                      <div className="flex space-x-2">
                        <Button 
                          variant="secondary" 
                          icon={Search} 
                          onClick={() => {
                            setSearchQuery('');
                            setPrevModal('document');
                            setShowModal('search_product');
                          }}
                        >
                          Buscar Producto
                        </Button>
                      </div>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 border-b border-slate-200">
                          <tr>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Producto</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Bodega</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Cant.</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Precio</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Desc %</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
                            <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {newDoc.lines?.map((line, idx) => (
                            <tr key={idx}>
                              <td className="px-4 py-3 text-sm font-medium text-slate-900">{line.product_name}</td>
                              <td className="px-4 py-3">
                                <select 
                                  value={line.warehouse_id || ''} 
                                  onChange={(e) => updateLine(idx, 'warehouse_id', parseInt(e.target.value))}
                                  className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                                >
                                  {warehouses.map(w => (
                                    <option key={w.id} value={w.id}>{w.name}</option>
                                  ))}
                                </select>
                              </td>
                              <td className="px-4 py-3">
                                <input 
                                  type="number" 
                                  value={(typeof line.quantity === 'number' && isNaN(line.quantity)) ? '' : (line.quantity ?? 0)} 
                                  onChange={(e) => updateLine(idx, 'quantity', parseFloat(e.target.value))}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-right text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input 
                                  type="number" 
                                  value={(typeof line.price === 'number' && isNaN(line.price)) ? '' : (line.price ?? 0)} 
                                  onChange={(e) => updateLine(idx, 'price', parseFloat(e.target.value))}
                                  className="w-24 px-2 py-1 border border-slate-200 rounded text-right text-sm"
                                />
                              </td>
                              <td className="px-4 py-3">
                                <input 
                                  type="number" 
                                  value={(typeof line.discount === 'number' && isNaN(line.discount)) ? '' : (line.discount ?? 0)} 
                                  onChange={(e) => updateLine(idx, 'discount', parseFloat(e.target.value))}
                                  className="w-20 px-2 py-1 border border-slate-200 rounded text-right text-sm"
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">${line.total.toLocaleString()}</td>
                              <td className="px-4 py-3 text-right">
                                <button 
                                  onClick={() => setNewDoc(prev => ({ ...prev, lines: prev.lines?.filter((_, i) => i !== idx) }))}
                                  className="text-rose-500 hover:text-rose-700"
                                >
                                  <X size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Totals */}
                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Subtotal Neto:</span>
                        <span>${calculateDocTotals().subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Desc. Global:</span>
                        <span>-${(calculateDocTotals().subtotal - calculateDocTotals().discounted).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>IVA (19%):</span>
                        <span>${calculateDocTotals().vat.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-indigo-600 pt-2 border-t border-slate-200">
                        <span>Total:</span>
                        <span>${calculateDocTotals().total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={() => setShowModal(null)}>Cancelar</Button>
                    <Button onClick={handleSaveDoc} disabled={!newDoc.lines?.length || !newDoc.entity_rut}>Finalizar Documento</Button>
                  </div>
                </div>
              )}

              {showModal === 'kardex' && (
                <div className="space-y-6">
                  <div className="flex justify-end space-x-3">
                    <Button 
                      icon={Download} 
                      variant="secondary" 
                      onClick={() => {
                        let balance = 0;
                        const data = (kardexData || []).map(k => {
                          balance += k.movement;
                          const [y, m, d] = k.date.split('-');
                          return {
                            'Fecha': `${d}-${m}-${y}`,
                            'Tipo': k.doc_type.replace('_', ' '),
                            'Número': k.doc_number,
                            'Socio': k.entity_name || 'N/A',
                            'Movimiento': k.movement,
                            'Saldo': balance,
                            'Precio Unit.': k.price,
                            'Costo Promedio': k.avg_cost
                          };
                        });
                        const ws = XLSX.utils.json_to_sheet(data);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "Kardex");
                        XLSX.writeFile(wb, `kardex_${kardexProduct}.xlsx`);
                      }}
                    >
                      Exportar Excel
                    </Button>
                    <Button 
                      icon={FileText} 
                      variant="secondary"
                      onClick={() => {
                        const doc = new jsPDF();
                        doc.text(`Kardex de Producto: ${kardexProduct} - ${kardexProductName}`, 14, 15);
                        
                        let balance = 0;
                          const body = (kardexData || []).map(k => {
                            balance += k.movement;
                            const [y, m, d] = k.date.split('-');
                            return [
                              `${d}-${m}-${y}`,
                              k.warehouse_name || 'N/A',
                              k.doc_type.replace('_', ' '),
                              k.doc_number,
                              k.entity_name || 'N/A',
                              k.movement.toString(),
                              balance.toString(),
                              k.price.toLocaleString(),
                              k.avg_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            ];
                          });

                          autoTable(doc, {
                            head: [['Fecha', 'Bodega', 'Tipo', 'Número', 'Socio', 'Movimiento', 'Saldo', 'P. Unit', 'Costo Prom.']],
                            body: body,
                            startY: 20,
                          });
                        doc.save(`kardex_${kardexProduct}.pdf`);
                      }}
                    >
                      Exportar PDF
                    </Button>
                  </div>
                  <Card>
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Bodega</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Número</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Socio de Negocio</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Movimiento</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Saldo</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">P. Unitario</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Costo Prom.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(() => {
                          let balance = 0;
                          return (kardexData || []).map((k, i) => {
                            balance += k.movement;
                            const [y, m, d] = k.date.split('-');
                            const formattedDate = `${d}-${m}-${y}`;
                            return (
                              <tr key={i}>
                                <td className="px-4 py-3 text-sm">{formattedDate}</td>
                                <td className="px-4 py-3 text-sm font-medium text-slate-700">{k.warehouse_name}</td>
                                <td className="px-4 py-3 text-sm capitalize">{k.doc_type.replace('_', ' ')}</td>
                                <td className="px-4 py-3 text-sm font-mono text-indigo-600">
                                  <button onClick={() => fetchDocDetails(k.id)} className="hover:underline">
                                    {k.doc_number}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-sm">{k.entity_name || <span className="text-slate-400 italic">N/A</span>}</td>
                                <td className={`px-4 py-3 text-sm font-bold text-right ${k.movement > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                                  {k.movement > 0 ? '+' : ''}{k.movement}
                                </td>
                                <td className="px-4 py-3 text-sm font-bold text-right text-slate-700">
                                  {balance}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-slate-600">
                                  ${k.price.toLocaleString()}
                                </td>
                                <td className="px-4 py-3 text-sm text-right text-indigo-600 font-medium">
                                  ${k.avg_cost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </Card>
                </div>
              )}

              {showModal === 'stock_breakdown' && selectedStockProduct && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-400 uppercase">Producto</p>
                    <p className="text-xl font-bold text-slate-900">{selectedStockProduct.product_name}</p>
                    <p className="text-sm text-slate-500 font-mono">{selectedStockProduct.product_id}</p>
                  </div>

                  <Card>
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-700">Bodega</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Ingresos</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Egresos</th>
                          <th className="px-6 py-4 text-sm font-semibold text-slate-700 text-right">Saldo Actual</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {(stockBreakdown || []).map((b, i) => (
                          <tr key={i} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{b.warehouse_name}</td>
                            <td className="px-6 py-4 text-sm text-right text-emerald-600">{b.incomes}</td>
                            <td className="px-6 py-4 text-sm text-right text-rose-500">{b.expenses}</td>
                            <td className={`px-6 py-4 text-sm text-right font-bold ${(b.incomes - b.expenses) <= 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                              {b.incomes - b.expenses}
                            </td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-bold">
                          <td className="px-6 py-4 text-sm text-slate-900">TOTAL GLOBAL</td>
                          <td className="px-6 py-4 text-sm text-right text-emerald-600">
                            {stockBreakdown.reduce((acc, curr) => acc + curr.incomes, 0)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-rose-500">
                            {stockBreakdown.reduce((acc, curr) => acc + curr.expenses, 0)}
                          </td>
                          <td className="px-6 py-4 text-sm text-right text-indigo-600">
                            {stockBreakdown.reduce((acc, curr) => acc + (curr.incomes - curr.expenses), 0)}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </Card>

                  <div className="flex justify-end pt-4">
                    <Button onClick={() => setShowModal(null)}>Cerrar</Button>
                  </div>
                </div>
              )}

              {showModal === 'viewDoc' && selectedDoc && (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4 bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Entidad</p>
                      <p className="text-lg font-bold text-slate-900">{selectedDoc.entity_name}</p>
                      <p className="text-sm text-slate-500">{selectedDoc.entity_rut}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Fecha</p>
                      <p className="text-lg font-bold text-slate-900">{formatDate(selectedDoc.date)}</p>
                      <p className="text-sm text-slate-500 capitalize">{selectedDoc.doc_type.replace('_', ' ')}</p>
                      <p className="text-sm font-mono text-indigo-600">Interno: {selectedDoc.internal_number}</p>
                      <p className="text-sm font-mono text-slate-600">NumDoc: {selectedDoc.doc_number}</p>
                    </div>
                  </div>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Producto</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Cant.</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Precio</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {selectedDoc.lines?.map((line, idx) => (
                          <tr key={idx}>
                            <td className="px-4 py-3 text-sm font-medium text-slate-900">{line.product_name}</td>
                            <td className="px-4 py-3 text-sm text-right">{line.quantity}</td>
                            <td className="px-4 py-3 text-sm text-right">${line.price.toLocaleString()}</td>
                            <td className="px-4 py-3 text-sm font-bold text-slate-900 text-right">${line.total.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end">
                    <div className="w-64 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>Neto:</span>
                        <span>${selectedDoc.total_net.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm text-slate-600">
                        <span>IVA (19%):</span>
                        <span>${selectedDoc.total_vat.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-lg font-bold text-indigo-600 pt-2 border-t border-slate-200">
                        <span>Total:</span>
                        <span>${selectedDoc.total_amount.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    {selectedDoc.status !== 'paid' && selectedDoc.payment_method !== 'credito' && (
                      <Button variant="success" onClick={() => { 
                        setPaymentAmount(selectedDoc.total_amount); 
                        setShowModal('payment'); 
                      }}>Pagar</Button>
                    )}
                    <Button variant="secondary" onClick={() => { 
                      setNewDoc({
                        ...selectedDoc,
                        lines: selectedDoc.lines || []
                      }); 
                      setShowModal('document'); 
                    }}>Modificar</Button>
                    <Button onClick={() => setShowModal(null)}>Cerrar</Button>
                  </div>
                </div>
              )}

              {showModal === 'payment' && selectedDoc && (
                <div className="space-y-6">
                  <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                    <p className="text-sm text-slate-500">Saldo Pendiente:</p>
                    <p className="text-3xl font-bold text-rose-600">${(selectedDoc.total_amount - ((selectedDoc as any).paid_amount || 0)).toLocaleString()}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <Input 
                      label="Monto a Pagar" 
                      type="number" 
                      value={paymentAmount} 
                      onChange={(e:any) => setPaymentAmount(parseFloat(e.target.value))} 
                    />
                    <Select 
                      label="Método de Pago" 
                      value={paymentMethod} 
                      onChange={(e:any) => setPaymentMethod(e.target.value)}
                      options={[
                        { value: 'transferencia', label: 'Transferencia' },
                        { value: 'efectivo', label: 'Efectivo' },
                        { value: 'tarjeta', label: 'Tarjeta' },
                        { value: 'cheque', label: 'Cheque' }
                      ]}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <Button variant="secondary" onClick={() => setShowModal(null)}>Cancelar</Button>
                    <Button variant="success" onClick={handleSavePayment}>Confirmar Pago</Button>
                  </div>
                </div>
              )}

              {showModal === 'manage_categories' && (
                <div className="space-y-6">
                  <div className="flex bg-slate-100 p-1 rounded-lg w-fit">
                    <button 
                      onClick={() => { setManageCatType('category'); setEditingCat(null); setNewCatName(''); setCatActiveStatus(1); }}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${manageCatType === 'category' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Categorías
                    </button>
                    <button 
                      onClick={() => { setManageCatType('subcategory'); setEditingCat(null); setNewCatName(''); setCatActiveStatus(1); }}
                      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${manageCatType === 'subcategory' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Subcategorías
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div className={`col-span-1 space-y-4 p-6 rounded-xl border transition-all ${editingCat ? 'bg-indigo-50 border-indigo-200' : 'bg-slate-50 border-slate-200'}`}>
                      <h4 className="font-bold text-slate-900">{editingCat ? 'Editar' : 'Nueva'} {manageCatType === 'category' ? 'Categoría' : 'Subcategoría'}</h4>
                      {manageCatType === 'subcategory' && (
                        <Select 
                          label="Categoría Padre" 
                          value={selectedCatId || ''} 
                          onChange={(e:any) => setSelectedCatId(parseInt(e.target.value))}
                          options={[{ value: '', label: 'Seleccionar...' }, ...categories.map(c => ({ value: c.id, label: c.name }))]}
                        />
                      )}
                      <Input label="Nombre" value={newCatName} onChange={(e:any) => setNewCatName(e.target.value)} />
                      <Select 
                        label="Estado" 
                        value={catActiveStatus} 
                        onChange={(e:any) => setCatActiveStatus(parseInt(e.target.value))}
                        options={[
                          { value: 1, label: 'Activo' },
                          { value: 0, label: 'Inactivo' }
                        ]}
                      />
                      <div className="flex space-x-2">
                        {editingCat && (
                          <Button variant="secondary" className="flex-1" onClick={() => { setEditingCat(null); setNewCatName(''); setCatActiveStatus(1); }}>Cancelar</Button>
                        )}
                        <Button className="flex-1" onClick={handleSaveCategory} disabled={!newCatName || (manageCatType === 'subcategory' && !selectedCatId)}>
                          {editingCat ? 'Actualizar' : 'Agregar'}
                        </Button>
                      </div>
                    </div>

                    <div className="col-span-2">
                      <Card className="max-h-96 overflow-y-auto">
                        <table className="w-full text-left">
                          <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                            <tr>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Nombre</th>
                              {manageCatType === 'subcategory' && <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Categoría</th>}
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Estado</th>
                              <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {(manageCatType === 'category' ? categories : subcategories).map((item: any) => (
                              <tr key={item.id} className={item.is_active === 0 ? 'opacity-50' : ''}>
                                <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.name}</td>
                                {manageCatType === 'subcategory' && (
                                  <td className="px-4 py-3 text-sm text-slate-500">
                                    {categories.find(c => c.id === item.category_id)?.name}
                                  </td>
                                )}
                                <td className="px-4 py-3 text-sm">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${item.is_active === 1 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                    {item.is_active === 1 ? 'ACTIVO' : 'INACTIVO'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-right space-x-2">
                                  <button 
                                    onClick={() => {
                                      setEditingCat(item);
                                      setNewCatName(item.name);
                                      setCatActiveStatus(item.is_active);
                                      if (manageCatType === 'subcategory') setSelectedCatId(item.category_id);
                                    }} 
                                    className="text-indigo-600 hover:text-indigo-800"
                                  >
                                    Editar
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </Card>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4">
                    {prevModal === 'document' && (
                      <Button onClick={() => setShowModal('document')}>Volver al Documento</Button>
                    )}
                    {prevModal === 'products' && (
                      <Button onClick={() => setShowModal('products')}>Volver al Producto</Button>
                    )}
                  </div>
                </div>
              )}

              {showModal === 'search_entity' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        autoFocus
                        type="text"
                        placeholder="Buscar por RUT o Nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <Button onClick={() => {
                      setPrevModal('search_entity');
                      setIsEditingEntity(false);
                      setShowModal('entities');
                    }}>+ Nuevo Socio</Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">RUT</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Nombre</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {entities
                          .filter(e => 
                            e.rut.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            e.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map(e => (
                            <tr key={e.rut} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-mono">{e.rut}</td>
                              <td className="px-4 py-3 text-sm font-medium">{e.name}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                <button 
                                  onClick={() => {
                                    setNewDoc(prev => ({
                                      ...prev,
                                      entity_rut: e.rut,
                                      global_discount: e.default_discount || 0
                                    }));
                                    setShowModal('document');
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold"
                                >
                                  Seleccionar
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={() => setShowModal('document')}>Cancelar</Button>
                  </div>
                </div>
              )}

              {showModal === 'search_product' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <div className="relative flex-1">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                        autoFocus
                        type="text"
                        placeholder="Buscar por Código o Nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <Button onClick={() => {
                      setPrevModal('search_product');
                      setShowModal('products');
                    }}>+ Nuevo Producto</Button>
                  </div>
                  <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Código</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase">Nombre</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Precio</th>
                          <th className="px-4 py-2 text-xs font-bold text-slate-500 uppercase text-right">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {products
                          .filter(p => 
                            p.id.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.name.toLowerCase().includes(searchQuery.toLowerCase())
                          )
                          .map(p => (
                            <tr key={p.id} className="hover:bg-slate-50">
                              <td className="px-4 py-3 text-sm font-mono">{p.id}</td>
                              <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                              <td className="px-4 py-3 text-sm text-right font-bold">${p.unit_price.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-right">
                                <button 
                                  onClick={() => {
                                    handleAddLine(p.id);
                                    setShowModal('document');
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold"
                                >
                                  Agregar
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="secondary" onClick={() => setShowModal('document')}>Cancelar</Button>
                  </div>
                </div>
              )}

              {showModal === 'partner_transactions' && selectedPartner && (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-bold">RUT</p>
                      <p className="text-sm font-medium">{selectedPartner.rut}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-bold">Ciudad/Comuna</p>
                      <p className="text-sm font-medium">{selectedPartner.ciudad}/{selectedPartner.comuna}</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-bold">Descuento Base</p>
                      <p className="text-sm font-medium">{selectedPartner.default_discount}%</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                      <p className="text-xs text-slate-500 uppercase font-bold">Membresía</p>
                      <p className="text-sm font-medium">{selectedPartner.is_partner ? 'SÍ' : 'NO'}</p>
                    </div>
                  </div>

                  <Card>
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Fecha</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Interno</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">NumDoc</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Tipo</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Total</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase">Estado</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Días</th>
                          <th className="px-4 py-3 text-xs font-bold text-slate-500 uppercase text-right">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {partnerTransactions.map((doc) => {
                          const isPaid = (doc as any).paid_amount >= doc.total_amount;
                          const daysSince = Math.floor((new Date().getTime() - new Date(doc.date).getTime()) / (1000 * 60 * 60 * 24));
                          
                          return (
                            <tr key={doc.id}>
                              <td className="px-4 py-3 text-sm">{formatDate(doc.date)}</td>
                              <td className="px-4 py-3 text-sm font-mono font-bold text-indigo-600">{doc.internal_number}</td>
                              <td className="px-4 py-3 text-sm font-mono">{doc.doc_number}</td>
                              <td className="px-4 py-3 text-sm uppercase">{doc.doc_type}</td>
                              <td className="px-4 py-3 text-sm font-bold text-right">${doc.total_amount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                  {isPaid ? 'PAGADA' : 'IMPAGA'}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-right font-mono">
                                {!isPaid ? daysSince : '-'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right">
                                <button onClick={() => fetchDocDetails(doc.id!)} className="text-indigo-600 hover:text-indigo-800 font-medium">Ver</button>
                              </td>
                            </tr>
                          );
                        })}
                        {partnerTransactions.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-slate-400 italic">No hay transacciones registradas</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </Card>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* RUT Error Modal */}
      <AnimatePresence>
        {validationError.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
            >
              <div className="flex items-center space-x-3 text-rose-600 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-lg font-bold">Error de Validación</h3>
              </div>
              <p className="text-slate-600 mb-6">
                {validationError.msg}
                {validationError.expectedDv && (
                  <span className="block mt-2 font-medium text-slate-900">
                    El dígito verificador correcto sugerido es: <span className="text-indigo-600 font-bold underline">"{validationError.expectedDv}"</span>
                  </span>
                )}
              </p>
              <div className="flex justify-end">
                <Button onClick={() => setValidationError({ ...validationError, show: false })}>Entendido</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Zoom Modal */}
      <AnimatePresence>
        {zoomedImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setZoomedImage(null)}
            className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-8 cursor-zoom-out"
          >
            <motion.img 
              initial={{ scale: 0.5 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.5 }}
              src={zoomedImage} 
              alt="Zoomed" 
              className="max-w-full max-h-full object-contain shadow-2xl rounded-xl"
              style={{ transform: 'scale(1.5)' }} // 3x larger than original thumbnail (which was w-10 h-10)
              referrerPolicy="no-referrer"
            />
            <button className="absolute top-8 right-8 text-white/50 hover:text-white transition-colors">
              <X size={40} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Supervisor Authorization Modal */}
      <AnimatePresence>
        {supervisorAuth.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
            >
              <div className="flex items-center space-x-3 text-amber-600 mb-4">
                <ShieldAlert size={24} />
                <h3 className="text-lg font-bold">Autorización de Supervisor</h3>
              </div>
              <p className="text-slate-600 mb-6">
                El stock es insuficiente. Se requiere autorización de un supervisor para continuar con la venta.
              </p>
              <Input 
                label="Clave de Supervisor" 
                type="password" 
                value={supervisorAuth.password} 
                onChange={(e:any) => setSupervisorAuth({...supervisorAuth, password: e.target.value})} 
                placeholder="Ingrese clave"
              />
              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="secondary" onClick={() => setSupervisorAuth({ ...supervisorAuth, show: false })}>Cancelar</Button>
                <Button onClick={supervisorAuth.onAuthorized}>Autorizar</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm.show && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200"
            >
              <div className="flex items-center space-x-3 text-rose-600 mb-4">
                <Trash2 size={24} />
                <h3 className="text-lg font-bold">Confirmar Eliminación</h3>
              </div>
              <p className="text-slate-600 mb-6">
                ¿Realmente quieres eliminar el documento? Esta acción no se puede deshacer y revertirá los movimientos de stock.
              </p>
              <div className="flex justify-end space-x-3">
                <Button variant="secondary" onClick={() => setShowDeleteConfirm({ show: false, id: null })}>NO</Button>
                <Button variant="danger" onClick={() => showDeleteConfirm.id && handleDeleteDoc(showDeleteConfirm.id)}>SÍ, Eliminar</Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
      )}
    </>
  );
}
