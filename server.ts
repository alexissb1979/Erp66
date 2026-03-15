import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { initializeDatabase } from './db-init.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_ANON_KEY must be set in .env");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function startServer() {
  await initializeDatabase();
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  const PORT = 3000;

  // Health check
  app.get("/api/health", async (req, res) => {
    try {
      if (!supabaseUrl || !supabaseAnonKey) {
        return res.status(500).json({ 
          status: "error", 
          message: "Supabase environment variables are missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY in the Secrets panel." 
        });
      }
      const { error } = await supabase.from('warehouses').select('id').limit(1);
      if (error) throw error;
      res.json({ status: "ok", database: "connected" });
    } catch (e: any) {
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  // API Routes
  
  // Master: Warehouses
  app.get("/api/warehouses", async (req, res) => {
    const { data, error } = await supabase.from('warehouses').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/warehouses", async (req, res) => {
    const { name } = req.body;
    const { data, error } = await supabase.from('warehouses').insert([{ name }]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ id: data[0].id });
  });

  app.put("/api/warehouses/:id", async (req, res) => {
    const { name } = req.body;
    const { error } = await supabase.from('warehouses').update({ name }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/warehouses/:id", async (req, res) => {
    try {
      // Check if warehouse has stock or movements
      const { data: stockData, error: stockError } = await supabase
        .from('stock')
        .select('quantity')
        .eq('warehouse_id', req.params.id)
        .neq('quantity', 0);
      
      if (stockError) throw stockError;
      if (stockData && stockData.length > 0) {
        return res.status(400).json({ error: "No se puede eliminar una bodega con stock actual." });
      }
      
      const { error: deleteError } = await supabase.from('warehouses').delete().eq('id', req.params.id);
      if (deleteError) throw deleteError;
      
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Master: Products
  app.get("/api/products", async (req, res) => {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name),
        subcategory:subcategories(name)
      `);
    
    if (error) return res.status(400).json({ error: error.message });
    
    // Flatten the response to match frontend expectations
    const flattened = data.map(p => ({
      ...p,
      category_name: p.category?.name,
      subcategory_name: p.subcategory?.name
    }));
    
    res.json(flattened);
  });

  app.post("/api/products", async (req, res) => {
    const { id, name, description, unit_price, category_id, subcategory_id, image_url, is_active } = req.body;
    try {
      const { data: existing, error: fetchError } = await supabase.from('products').select('id').eq('id', id).single();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
      
      if (existing) {
        const { error } = await supabase.from('products').update({
          name, description, unit_price, category_id, subcategory_id, image_url, is_active: is_active ?? true
        }).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('products').insert([{
          id, name, description, unit_price, category_id, subcategory_id, image_url, is_active: is_active ?? true
        }]);
        if (error) throw error;
      }
      res.status(201).json({ id });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    const { id } = req.params;
    try {
      const { count, error: countError } = await supabase
        .from('document_lines')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', id);
      
      if (countError) throw countError;
      
      if (count && count > 0) {
        const { error } = await supabase.from('products').update({ is_active: false }).eq('id', id);
        if (error) throw error;
        return res.json({ message: "Product has movements and was disabled instead of deleted." });
      }
      
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Master: Categories & Subcategories
  app.get("/api/categories", async (req, res) => {
    const { data, error } = await supabase.from('categories').select('*');
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/categories", async (req, res) => {
    const { name, is_active } = req.body;
    const { data, error } = await supabase.from('categories').insert([{ name, is_active: is_active ?? true }]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ id: data[0].id });
  });

  app.put("/api/categories/:id", async (req, res) => {
    const { name, is_active } = req.body;
    const { error } = await supabase.from('categories').update({ name, is_active }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/categories/:id", async (req, res) => {
    const { error } = await supabase.from('categories').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.get("/api/subcategories", async (req, res) => {
    const { category_id } = req.query;
    let query = supabase.from('subcategories').select('*');
    if (category_id) {
      query = query.eq('category_id', category_id);
    }
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/subcategories", async (req, res) => {
    const { category_id, name, is_active } = req.body;
    const { data, error } = await supabase.from('subcategories').insert([{ category_id, name, is_active: is_active ?? true }]).select();
    if (error) return res.status(400).json({ error: error.message });
    res.status(201).json({ id: data[0].id });
  });

  app.put("/api/subcategories/:id", async (req, res) => {
    const { category_id, name, is_active } = req.body;
    const { error } = await supabase.from('subcategories').update({ category_id, name, is_active }).eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  app.delete("/api/subcategories/:id", async (req, res) => {
    const { error } = await supabase.from('subcategories').delete().eq('id', req.params.id);
    if (error) return res.status(400).json({ error: error.message });
    res.json({ success: true });
  });

  // Master: Socios de Negocios (Entities)
  app.get("/api/entities", async (req, res) => {
    const { type } = req.query;
    let query = supabase.from('entities').select('*');
    if (type) {
      query = query.or(`type.eq.${type},type.eq.both`);
    }
    const { data, error } = await query;
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  });

  app.post("/api/entities", async (req, res) => {
    const { 
      rut, name, type, address, phone, email,
      comuna, ciudad, is_partner, default_discount,
      person_type, contact_name, contact_phone, contact_email
    } = req.body;
    try {
      const { data: existing, error: fetchError } = await supabase.from('entities').select('rut').eq('rut', rut).single();
      
      if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

      if (existing) {
        const { error } = await supabase.from('entities').update({
          name, type, address, phone, email,
          comuna, ciudad, is_partner, default_discount,
          person_type, contact_name, contact_phone, contact_email
        }).eq('rut', rut);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('entities').insert([{
          rut, name, type, address, phone, email,
          comuna, ciudad, is_partner, default_discount,
          person_type, contact_name, contact_phone, contact_email
        }]);
        if (error) throw error;
      }
      res.status(201).json({ rut });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/entities/:rut/transactions", async (req, res) => {
    const { rut } = req.params;
    try {
      const { data: docs, error: docError } = await supabase
        .from('documents')
        .select(`
          *,
          payments(amount)
        `)
        .eq('entity_rut', rut)
        .order('date', { ascending: false });
      
      if (docError) throw docError;
      
      const processed = docs.map(d => ({
        ...d,
        paid_amount: (d.payments as any[]).reduce((sum, p) => sum + p.amount, 0)
      }));
      
      res.json(processed);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Documents
  app.get("/api/documents", async (req, res) => {
    const { category, q, type } = req.query;
    try {
      let query = supabase.from('documents').select(`
        *,
        entity:entities(name)
      `);

      if (category) query = query.eq('category', category);
      if (type) query = query.eq('doc_type', type);
      if (q) {
        query = query.or(`doc_number.ilike.%${q}%,entity_rut.ilike.%${q}%`);
      }

      const { data, error } = await query;
      if (error) throw error;

      const flattened = data.map(d => ({
        ...d,
        entity_name: d.entity?.name
      }));

      res.json(flattened);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/documents/next-number", async (req, res) => {
    const { category } = req.query;
    const { data, error } = await supabase
      .from('documents')
      .select('internal_number')
      .eq('category', category)
      .order('id', { ascending: false })
      .limit(1);
    
    if (error) return res.status(400).json({ error: error.message });
    
    let next = 1;
    if (data && data.length > 0 && data[0].internal_number) {
      next = parseInt(data[0].internal_number) + 1;
    }
    res.json({ next: next.toString().padStart(6, '0') });
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select(`
          *,
          entity:entities(name)
        `)
        .eq('id', req.params.id)
        .single();
      
      if (docError) throw docError;
      if (!doc) return res.status(404).json({ error: "Document not found" });

      const { data: lines, error: lineError } = await supabase
        .from('document_lines')
        .select(`
          *,
          product:products(name),
          warehouse:warehouses(name)
        `)
        .eq('document_id', req.params.id);
      
      if (lineError) throw lineError;

      const processedLines = lines.map(l => ({
        ...l,
        product_name: l.product?.name,
        warehouse_name: l.warehouse?.name
      }));

      res.json({ ...doc, entity_name: doc.entity?.name, lines: processedLines });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  const updateStock = async (prodId: string, whId: number, qty: number, loc: string = 'General') => {
    const { data: existing, error: fetchError } = await supabase
      .from('stock')
      .select('*')
      .eq('product_id', prodId)
      .eq('warehouse_id', whId)
      .eq('location', loc)
      .single();
    
    if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

    if (existing) {
      const { error: updateError } = await supabase
        .from('stock')
        .update({ quantity: existing.quantity + qty })
        .eq('product_id', prodId)
        .eq('warehouse_id', whId)
        .eq('location', loc);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('stock')
        .insert([{ product_id: prodId, warehouse_id: whId, location: loc, quantity: qty }]);
      if (insertError) throw insertError;
    }
  };

  app.put("/api/documents/:id", async (req, res) => {
    const { id } = req.params;
    const { 
      doc_number, doc_type, category, date, entity_rut, 
      global_discount, payment_method, lines,
      from_warehouse_id, to_warehouse_id, status
    } = req.body;

    try {
      // 1. Get old document and lines
      const { data: oldDoc, error: oldDocError } = await supabase.from('documents').select('*').eq('id', id).single();
      if (oldDocError) throw oldDocError;
      const { data: oldLines, error: oldLinesError } = await supabase.from('document_lines').select('*').eq('document_id', id);
      if (oldLinesError) throw oldLinesError;

      // 2. Reverse old stock changes
      for (const line of oldLines) {
        const lineWhId = line.warehouse_id || (oldDoc.category === 'purchase' ? oldDoc.to_warehouse_id : oldDoc.from_warehouse_id) || 1;
        if (oldDoc.category === 'purchase') {
          const qty = oldDoc.doc_type === 'nota_credito' ? line.quantity : -line.quantity;
          await updateStock(line.product_id, lineWhId, qty);
        } else if (oldDoc.category === 'sale') {
          const qty = oldDoc.doc_type === 'nota_credito' ? -line.quantity : line.quantity;
          await updateStock(line.product_id, lineWhId, qty);
        } else if (oldDoc.category === 'transfer') {
          await updateStock(line.product_id, oldDoc.from_warehouse_id, line.quantity);
          await updateStock(line.product_id, oldDoc.to_warehouse_id, -line.quantity);
        }
      }

      // 3. Calculate new totals
      let total_net = 0;
      for (const line of lines) {
        total_net += line.total;
      }
      const discounted_net = total_net * (1 - (global_discount / 100));
      const total_vat = discounted_net * 0.19;
      const total_amount = discounted_net + total_vat;

      const newStatus = status || ((payment_method === 'credito') ? 'active' : 'paid');

      // 4. Update document header
      const { error: updateDocError } = await supabase.from('documents').update({
        doc_number, doc_type, category, date, entity_rut, 
        global_discount, payment_method, total_net: discounted_net, total_vat, total_amount,
        from_warehouse_id, to_warehouse_id, status: newStatus
      }).eq('id', id);
      if (updateDocError) throw updateDocError;

      // 5. Delete old lines
      const { error: deleteLinesError } = await supabase.from('document_lines').delete().eq('document_id', id);
      if (deleteLinesError) throw deleteLinesError;

      // 6. Insert new lines and apply new stock changes
      for (const line of lines) {
        const { error: insertLineError } = await supabase.from('document_lines').insert([{
          document_id: id, product_id: line.product_id, warehouse_id: line.warehouse_id, 
          quantity: line.quantity, price: line.price, discount: line.discount, total: line.total
        }]);
        if (insertLineError) throw insertLineError;

        const lineWhId = line.warehouse_id || (category === 'purchase' ? to_warehouse_id : from_warehouse_id) || 1;

        if (category === 'purchase') {
          const qty = doc_type === 'nota_credito' ? -line.quantity : line.quantity;
          await updateStock(line.product_id, lineWhId, qty);
        } else if (category === 'sale') {
          const qty = doc_type === 'nota_credito' ? line.quantity : -line.quantity;
          await updateStock(line.product_id, lineWhId, qty);
        } else if (category === 'transfer') {
          await updateStock(line.product_id, from_warehouse_id, -line.quantity);
          await updateStock(line.product_id, to_warehouse_id, line.quantity);
        }
      }

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Get document details to revert stock
      const { data: doc, error: docError } = await supabase
        .from('documents')
        .select('*, lines:document_lines(*)')
        .eq('id', id)
        .single();
      
      if (docError) throw docError;

      // Revert stock
      for (const line of doc.lines) {
        const lineWhId = line.warehouse_id || (doc.category === 'purchase' ? doc.to_warehouse_id : doc.from_warehouse_id) || 1;
        
        if (doc.category === 'purchase') {
          const qty = doc.doc_type === 'nota_credito' ? line.quantity : -line.quantity;
          await updateStock(line.product_id, lineWhId, qty);
        } else if (doc.category === 'sale') {
          const qty = doc.doc_type === 'nota_credito' ? -line.quantity : line.quantity;
          await updateStock(line.product_id, lineWhId, qty);
        } else if (doc.category === 'transfer') {
          await updateStock(line.product_id, doc.from_warehouse_id, line.quantity);
          await updateStock(line.product_id, doc.to_warehouse_id, -line.quantity);
        }
      }

      const { error: deleteError } = await supabase.from('documents').delete().eq('id', id);
      if (deleteError) throw deleteError;

      res.json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/documents", async (req, res) => {
    const { 
      internal_number, doc_number, doc_type, category, date, entity_rut, 
      global_discount, payment_method, lines,
      from_warehouse_id, to_warehouse_id
    } = req.body;

    try {
      // Check for duplicates
      const { data: existing } = await supabase
        .from('documents')
        .select('id')
        .eq('entity_rut', entity_rut)
        .eq('doc_number', doc_number)
        .eq('category', category)
        .limit(1);
      
      if (existing && existing.length > 0) {
        throw new Error(`Ya existe un documento con el número ${doc_number} para este socio de negocio.`);
      }

      // Calculate totals
      let total_net = 0;
      for (const line of lines) {
        total_net += line.total;
      }
      const discounted_net = total_net * (1 - (global_discount / 100));
      const total_vat = discounted_net * 0.19;
      const total_amount = discounted_net + total_vat;

      const status = (payment_method === 'credito') ? 'active' : 'paid';

      const { data: docData, error: docError } = await supabase.from('documents').insert([{
        internal_number, doc_number, doc_type, category, date, entity_rut, 
        global_discount, payment_method, total_net: discounted_net, total_vat, total_amount,
        from_warehouse_id, to_warehouse_id, status
      }]).select();

      if (docError) throw docError;
      const docId = docData[0].id;

      for (const line of lines) {
        // Stock check for sales
        if (category === 'sale' && doc_type !== 'nota_credito') {
          const { data: stockData } = await supabase
            .from('stock')
            .select('quantity')
            .eq('product_id', line.product_id)
            .eq('warehouse_id', line.warehouse_id || from_warehouse_id || 1)
            .single();
          
          const currentStock = stockData?.quantity || 0;
          if (currentStock < line.quantity && !req.body.supervisorAuthorized) {
            throw new Error(`Stock insuficiente para el producto ${line.product_id}. Stock actual: ${currentStock}`);
          }
        }

        const { error: lineError } = await supabase.from('document_lines').insert([{
          document_id: docId, product_id: line.product_id, warehouse_id: line.warehouse_id, 
          quantity: line.quantity, price: line.price, discount: line.discount, total: line.total
        }]);
        if (lineError) throw lineError;

        const lineWhId = line.warehouse_id || (category === 'purchase' ? to_warehouse_id : from_warehouse_id) || 1;

        if (category === 'purchase') {
          const qty = doc_type === 'nota_credito' ? -line.quantity : line.quantity;
          await updateStock(line.product_id, lineWhId, qty);
        } else if (category === 'sale') {
          const qty = doc_type === 'nota_credito' ? line.quantity : -line.quantity;
          await updateStock(line.product_id, lineWhId, qty);
        } else if (category === 'transfer') {
          await updateStock(line.product_id, from_warehouse_id, -line.quantity);
          await updateStock(line.product_id, to_warehouse_id, line.quantity);
        }
      }

      res.status(201).json({ id: docId });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Payments
  app.post("/api/payments", async (req, res) => {
    const { document_id, date, amount, method } = req.body;
    try {
      const { error: payError } = await supabase.from('payments').insert([{ document_id, date, amount, method }]);
      if (payError) throw payError;
      
      // Check if document is fully paid
      const { data: doc, error: docError } = await supabase.from('documents').select('total_amount').eq('id', document_id).single();
      if (docError) throw docError;

      const { data: payments, error: paymentsError } = await supabase.from('payments').select('amount').eq('document_id', document_id);
      if (paymentsError) throw paymentsError;

      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      
      if (totalPaid >= doc.total_amount) {
        await supabase.from('documents').update({ status: 'paid' }).eq('id', document_id);
      }

      res.status(201).json({ success: true });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Reports
  app.get("/api/reports/stock", async (req, res) => {
    try {
      // This is a complex query that might be better as a Supabase View or RPC
      // For now, we'll fetch products and calculate manually or use a simplified approach
      const { data: products, error: prodError } = await supabase.from('products').select('id, name').eq('is_active', true);
      if (prodError) throw prodError;

      const { data: lines, error: lineError } = await supabase
        .from('document_lines')
        .select(`
          quantity,
          price,
          product_id,
          document:documents(category, doc_type, from_warehouse_id, to_warehouse_id)
        `);
      
      if (lineError) throw lineError;

      const report = products.map(p => {
        const pLines = lines.filter(l => l.product_id === p.id);
        let incomes = 0;
        let expenses = 0;
        let totalPurchasePrice = 0;
        let purchaseCount = 0;

        for (const l of pLines) {
          const d = l.document as any;
          if ((d.category === 'purchase' && d.doc_type !== 'nota_credito') ||
              (d.category === 'sale' && d.doc_type === 'nota_credito') ||
              (d.category === 'transfer' && d.to_warehouse_id !== null)) {
            incomes += l.quantity;
            if (d.category === 'purchase' && d.doc_type !== 'nota_credito') {
              totalPurchasePrice += l.price;
              purchaseCount++;
            }
          } else {
            expenses += l.quantity;
          }
        }

        return {
          product_id: p.id,
          product_name: p.name,
          incomes,
          expenses,
          avg_purchase_price: purchaseCount > 0 ? totalPurchasePrice / purchaseCount : null
        };
      });

      res.json(report);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/reports/stock-breakdown/:productId", async (req, res) => {
    const { productId } = req.params;
    try {
      const { data: warehouses, error: whError } = await supabase.from('warehouses').select('*');
      if (whError) throw whError;

      const { data: lines, error: lineError } = await supabase
        .from('document_lines')
        .select(`
          quantity,
          warehouse_id,
          document:documents(category, doc_type, from_warehouse_id, to_warehouse_id)
        `)
        .eq('product_id', productId);
      
      if (lineError) throw lineError;

      const breakdown = warehouses.map(w => {
        const wLines = lines.filter(l => l.warehouse_id === w.id);
        let incomes = 0;
        let expenses = 0;

        for (const l of wLines) {
          const d = l.document as any;
          if ((d.category === 'purchase' && d.doc_type !== 'nota_credito') ||
              (d.category === 'sale' && d.doc_type === 'nota_credito') ||
              (d.category === 'transfer' && d.to_warehouse_id === w.id)) {
            incomes += l.quantity;
          } else {
            expenses += l.quantity;
          }
        }

        return {
          warehouse_id: w.id,
          warehouse_name: w.name,
          incomes,
          expenses
        };
      });

      res.json(breakdown);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/reports/kardex/:productId", async (req, res) => {
    try {
      const { data: rows, error } = await supabase
        .from('document_lines')
        .select(`
          id,
          quantity,
          price,
          document:documents(
            *,
            entity:entities(name)
          ),
          warehouse:warehouses(name)
        `)
        .eq('product_id', req.params.productId);
      
      if (error) throw error;

      // Sort by date and id
      const sorted = rows.sort((a, b) => {
        const dateA = new Date((a.document as any).date).getTime();
        const dateB = new Date((b.document as any).date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return (a.document as any).id - (b.document as any).id;
      });

      let currentStock = 0;
      let currentAvgCost = 0;
      let totalValue = 0;

      const processedRows = sorted.map(row => {
        const d = row.document as any;
        let movement = 0;
        if ((d.category === 'purchase' && d.doc_type !== 'nota_credito') ||
            (d.category === 'sale' && d.doc_type === 'nota_credito') ||
            (d.category === 'transfer' && d.to_warehouse_id !== null)) {
          movement = row.quantity;
        } else {
          movement = -row.quantity;
        }

        const price = row.price;

        if (d.category === 'purchase' && d.doc_type !== 'nota_credito') {
          const newTotalValue = totalValue + (movement * price);
          const newTotalStock = currentStock + movement;
          if (newTotalStock > 0) {
            currentAvgCost = newTotalValue / newTotalStock;
          }
          totalValue = newTotalValue;
          currentStock = newTotalStock;
        } else if (d.category === 'sale' && d.doc_type === 'nota_credito') {
          const newTotalValue = totalValue + (movement * currentAvgCost);
          const newTotalStock = currentStock + movement;
          if (newTotalStock > 0) {
            currentAvgCost = newTotalValue / newTotalStock;
          }
          totalValue = newTotalValue;
          currentStock = newTotalStock;
        } else if (movement < 0) {
          currentStock += movement;
          totalValue = currentStock * currentAvgCost;
        } else if (d.category === 'transfer') {
          currentStock += movement;
          totalValue = currentStock * currentAvgCost;
        }

        return {
          id: d.id,
          date: d.date,
          internal_number: d.internal_number,
          doc_number: d.doc_number,
          doc_type: d.doc_type,
          category: d.category,
          quantity: row.quantity,
          price: row.price,
          entity_name: (d.entity as any)?.name,
          warehouse_name: (row.warehouse as any)?.name,
          movement,
          avg_cost: currentAvgCost
        };
      });

      res.json(processedRows);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.get("/api/reports/accounts", async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select(`
          *,
          entity:entities(name),
          payments(amount)
        `)
        .eq('payment_method', 'credito')
        .neq('status', 'cancelled');
      
      if (error) throw error;

      const processed = data.map(d => ({
        ...d,
        entity_name: d.entity?.name,
        paid_amount: (d.payments as any[]).reduce((sum, p) => sum + p.amount, 0)
      }));

      res.json(processed);
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
