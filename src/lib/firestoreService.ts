import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  writeBatch 
} from 'firebase/firestore';
import { db } from './firebase';
import { 
  PartMaster, 
  InventoryItem, 
  StockMovement, 
  WarehouseLocation, 
  Branch, 
  Warehouse, 
  EpcCategory, 
  AuditLog, 
  MovementType,
  PartQuality,
  PartCondition,
  VehicleCompatibility,
  ShortageItem,
  Supplier,
  Customer,
  PurchaseOrder,
  SalesInvoice,
  StocktakeSession,
  VinDecodeResult
} from '../types/erp';
import { 
  INITIAL_LOCATIONS, 
  INITIAL_BRANCHES, 
  INITIAL_WAREHOUSES, 
  INITIAL_EPC_CATEGORIES 
} from './seedData';

// Collection references
const PARTS_COL = 'parts';
const INVENTORY_COL = 'inventory';
const MOVEMENTS_COL = 'stock_movements';
const LOCATIONS_COL = 'locations';
const BRANCHES_COL = 'branches';
const WAREHOUSES_COL = 'warehouses';
const CATEGORIES_COL = 'categories';
const AUDIT_LOGS_COL = 'audit_logs';
const SHORTAGES_COL = 'shortages';
const SUPPLIERS_COL = 'suppliers';
const CUSTOMERS_COL = 'customers';
const PURCHASE_ORDERS_COL = 'purchase_orders';
const SALES_INVOICES_COL = 'sales_invoices';
const STOCKTAKE_COL = 'stocktake_sessions';
const VIN_LOOKUPS_COL = 'vin_lookups';

/**
 * Ensures basic warehouse structure (Branches, Warehouses, Locations, Categories) exists.
 * Does NOT populate fake items or transactions.
 */
export async function ensureDatabaseSeeded(): Promise<boolean> {
  try {
    const branchSnap = await getDocs(collection(db, BRANCHES_COL));
    
    if (!branchSnap.empty) {
      return false; // Infrastructure already exists
    }

    console.log('Initializing warehouse layout in Firestore...');
    const batch = writeBatch(db);

    // 1. Branches
    for (const b of INITIAL_BRANCHES) {
      const ref = doc(db, BRANCHES_COL, b.id);
      batch.set(ref, b);
    }

    // 2. Warehouses
    for (const w of INITIAL_WAREHOUSES) {
      const ref = doc(db, WAREHOUSES_COL, w.id);
      batch.set(ref, w);
    }

    // 3. Locations (with currentUnits: 0)
    for (const loc of INITIAL_LOCATIONS) {
      const ref = doc(db, LOCATIONS_COL, loc.id);
      batch.set(ref, { ...loc, currentUnits: 0 });
    }

    // 4. EPC Categories
    for (const cat of INITIAL_EPC_CATEGORIES) {
      const ref = doc(db, CATEGORIES_COL, cat.id);
      batch.set(ref, cat);
    }

    await batch.commit();
    console.log('Warehouse structure initialized with clean slate!');
    return true;
  } catch (error) {
    console.error('Error during database seed check:', error);
    return false;
  }
}

export async function forceReseedDatabase(): Promise<boolean> {
  const batch = writeBatch(db);
  for (const b of INITIAL_BRANCHES) {
    batch.set(doc(db, BRANCHES_COL, b.id), b);
  }
  for (const w of INITIAL_WAREHOUSES) {
    batch.set(doc(db, WAREHOUSES_COL, w.id), w);
  }
  for (const loc of INITIAL_LOCATIONS) {
    batch.set(doc(db, LOCATIONS_COL, loc.id), { ...loc, currentUnits: 0 });
  }
  for (const cat of INITIAL_EPC_CATEGORIES) {
    batch.set(doc(db, CATEGORIES_COL, cat.id), cat);
  }
  await batch.commit();
  return true;
}

/**
 * Wipe all business data (Parts, Inventory, Movements, Shortages, Partners, Orders, Invoices, Stocktakes)
 * and reset location counts to 0. Leaves branches and warehouse setup clean and ready.
 */
export async function wipeAllDatabaseData(user?: { id: string; name: string }): Promise<{ success: boolean; message: string }> {
  try {
    const collectionsToClear = [
      PARTS_COL,
      INVENTORY_COL,
      MOVEMENTS_COL,
      SHORTAGES_COL,
      SUPPLIERS_COL,
      CUSTOMERS_COL,
      PURCHASE_ORDERS_COL,
      SALES_INVOICES_COL,
      STOCKTAKE_COL,
      AUDIT_LOGS_COL,
      VIN_LOOKUPS_COL
    ];

    for (const colName of collectionsToClear) {
      const snap = await getDocs(collection(db, colName));
      if (!snap.empty) {
        // Chunk deletions into batches of 400
        const docs = snap.docs;
        for (let i = 0; i < docs.length; i += 400) {
          const chunk = docs.slice(i, i + 400);
          const batch = writeBatch(db);
          chunk.forEach((d) => batch.delete(d.ref));
          await batch.commit();
        }
      }
    }

    // Reset location currentUnits to 0
    const locSnap = await getDocs(collection(db, LOCATIONS_COL));
    if (!locSnap.empty) {
      const batch = writeBatch(db);
      locSnap.docs.forEach((d) => {
        batch.update(d.ref, { currentUnits: 0 });
      });
      await batch.commit();
    }

    // Record single clean initial log
    const now = new Date().toISOString();
    const auditId = `audit_wipe_${Date.now()}`;
    await setDoc(doc(db, AUDIT_LOGS_COL, auditId), {
      id: auditId,
      userId: user?.id || 'admin',
      userName: user?.name || 'المدير العام',
      action: 'SYSTEM_WIPE',
      entity: 'Database',
      entityId: 'ALL',
      details: 'تم تصفير ومسح كافة البيانات والمعاملات والأصناف بالكامل وتجهيز المنظومة بحالة جديدة تماماً',
      timestamp: now
    });

    return { success: true, message: 'تم تصفير ومسح كافة بيانات المنظومة بنجاح.' };
  } catch (error: any) {
    console.error('Error wiping database:', error);
    return { success: false, message: error.message || 'حدث خطأ أثناء تصفير البيانات' };
  }
}

// ----------------------------------------------------
// PARTS MASTER SERVICE
// ----------------------------------------------------

export function subscribeParts(callback: (parts: PartMaster[]) => void) {
  const q = query(collection(db, PARTS_COL));
  return onSnapshot(q, (snapshot) => {
    const parts: PartMaster[] = [];
    snapshot.forEach((d) => {
      parts.push({ id: d.id, ...(d.data() as Omit<PartMaster, 'id'>) });
    });
    callback(parts);
  }, (err) => {
    console.warn('Firestore parts subscription error:', err);
    callback([]);
  });
}

/**
 * Bulk Import Parts & Inventory Items atomically into Firestore
 */
export async function bulkImportParts(
  importedItems: Array<{
    partNumber: string;
    originalPartNumber?: string;
    nameAr: string;
    nameEn: string;
    categoryGroup?: string;
    subgroup?: string;
    brand?: string;
    quality?: PartQuality;
    condition?: PartCondition;
    side?: 'LEFT' | 'RIGHT' | 'BOTH' | 'N/A';
    position?: 'FRONT' | 'REAR' | 'UPPER' | 'LOWER' | 'CENTER' | 'N/A';
    chassisCompatibility?: string;
    costPrice: number;
    sellingPrice: number;
    wholesalePrice?: number;
    quantity: number;
    locationCode?: string;
    minStock?: number;
    maxStock?: number;
    barcode?: string;
    notes?: string;
  }>,
  user: { id: string; name: string },
  branch: Branch,
  warehouse: Warehouse,
  allLocations: WarehouseLocation[]
): Promise<{ successCount: number; errors: string[] }> {
  const now = new Date().toISOString();
  const errors: string[] = [];
  let successCount = 0;

  const chunkSize = 100;
  for (let i = 0; i < importedItems.length; i += chunkSize) {
    const chunk = importedItems.slice(i, i + chunkSize);
    const batch = writeBatch(db);

    for (let idx = 0; idx < chunk.length; idx++) {
      const item = chunk[idx];
      try {
        const rawPartNum = (item.partNumber || '').trim();
        const cleanPartNum = rawPartNum ? rawPartNum.toUpperCase() : `MB-IMPORT-${Date.now()}-${i + idx + 1}`;
        const safeDocSuffix = cleanPartNum.replace(/[/\\#?\[\]*]/g, '_').trim() || `PART_${Date.now()}_${i + idx + 1}`;
        const partId = `part_${safeDocSuffix}`;
        const qty = Math.max(0, Number(item.quantity) || 0);

        const fallbackLoc = allLocations && allLocations.length > 0 ? allLocations[0] : null;
        const targetLocCode = item.locationCode?.trim() || fallbackLoc?.code || 'A-03-02-07';
        const matchedLoc = (allLocations || []).find(l => l.code && l.code.toUpperCase() === targetLocCode.toUpperCase()) || fallbackLoc;
        const locationId = matchedLoc ? matchedLoc.id : 'loc_a_03_02_07';
        const finalLocCode = matchedLoc ? matchedLoc.code : targetLocCode;
        const safeLocSuffix = finalLocCode.replace(/[/\\#?\[\]*]/g, '_');

        const chassisList = (item.chassisCompatibility || 'W223')
          .split(/[,/|]/)
          .map(c => c.trim().toUpperCase())
          .filter(Boolean);

        const compatibilityArr: VehicleCompatibility[] = chassisList.map(chassis => ({
          chassis,
          model: `Mercedes-Benz ${chassis}`,
          engine: 'Standard OEM',
          yearFrom: 2018,
          yearTo: 2026
        }));

        const partRecord: PartMaster = {
          id: partId,
          partNumber: cleanPartNum,
          originalPartNumber: item.originalPartNumber?.trim().toUpperCase() || cleanPartNum,
          supersededNumbers: [],
          alternativeNumbers: [],
          nameAr: item.nameAr?.trim() || `قطعة مرسيدس ${cleanPartNum}`,
          nameEn: item.nameEn?.trim() || `Mercedes-Benz Part ${cleanPartNum}`,
          description: item.notes || `تم الاستيراد لفرع الحرفيين. القطعة متوافقة مع شاسيه ${chassisList.join(', ')}.`,
          categoryGroup: item.categoryGroup || '01 ENGINE & TIMING',
          subgroup: item.subgroup || '01-050 General Components',
          epcIllustration: 'EPC-GEN',
          epcPosition: '01',
          brand: item.brand || 'Mercedes-Benz Genuine Parts',
          quality: item.quality || 'GENUINE_OEM',
          condition: item.condition || 'NEW',
          side: item.side || 'N/A',
          position: item.position || 'N/A',
          unit: 'PCS',
          costPrice: Number(item.costPrice) || 0,
          sellingPrice: Number(item.sellingPrice) || 0,
          wholesalePrice: Number(item.wholesalePrice) || Number(item.sellingPrice) || 0,
          minStock: Number(item.minStock) || 2,
          maxStock: Number(item.maxStock) || 50,
          reorderLevel: 3,
          barcode: item.barcode || cleanPartNum,
          qrCode: `MB-PART-${cleanPartNum}`,
          notes: item.notes || `مستوردة عبر الإكسل — الرف ${finalLocCode}`,
          compatibility: compatibilityArr.length > 0 ? compatibilityArr : [{ chassis: 'W223', model: 'S-Class', engine: 'OEM', yearFrom: 2021, yearTo: 2026 }],
          totalStock: qty,
          availableStock: qty,
          createdAt: now,
          updatedAt: now
        };

        batch.set(doc(db, PARTS_COL, partId), partRecord, { merge: true });

        if (qty > 0) {
          const invId = `inv_${safeDocSuffix}_${safeLocSuffix}`;
          const invRecord: InventoryItem = {
            id: invId,
            partId: partId,
            partNumber: cleanPartNum,
            partNameEn: partRecord.nameEn,
            partNameAr: partRecord.nameAr,
            branchId: branch.id,
            branchName: branch.name,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            locationId: locationId,
            locationCode: finalLocCode,
            quantity: qty,
            reservedQuantity: 0,
            availableQuantity: qty,
            costPrice: partRecord.costPrice,
            sellingPrice: partRecord.sellingPrice,
            lastMovementDate: now,
            updatedAt: now
          };
          batch.set(doc(db, INVENTORY_COL, invId), invRecord, { merge: true });

          const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${idx}`;
          const movRecord: StockMovement = {
            id: movId,
            partId: partId,
            partNumber: cleanPartNum,
            partName: partRecord.nameAr,
            movementType: 'INITIAL_STOCK',
            quantity: qty,
            previousQuantity: 0,
            newQuantity: qty,
            branchId: branch.id,
            branchName: branch.name,
            warehouseId: warehouse.id,
            warehouseName: warehouse.name,
            destinationLocation: finalLocCode,
            reference: 'EXCEL-BULK-IMPORT',
            reason: `استيراد دفعة أصناف إكسل وتخزين بالرف ${finalLocCode}`,
            userId: user.id,
            userName: user.name,
            timestamp: now
          };
          batch.set(doc(db, MOVEMENTS_COL, movId), movRecord);
        }

        successCount++;
      } catch (err: any) {
        errors.push(`خطأ في معالجة القطعة ${item.partNumber || idx}: ${err.message}`);
      }
    }

    const auditId = `audit_${Date.now()}_${i}`;
    batch.set(doc(db, AUDIT_LOGS_COL, auditId), {
      id: auditId,
      userId: user.id,
      userName: user.name,
      action: 'BULK_IMPORT',
      entity: 'PartMaster',
      entityId: `BATCH_${i}`,
      details: `Bulk imported ${chunk.length} Mercedes-Benz parts via Excel/CSV at AH.Libya Store`,
      timestamp: now
    });

    await batch.commit();
  }

  return { successCount, errors };
}

export async function createPart(
  partData: Omit<PartMaster, 'id' | 'createdAt' | 'updatedAt' | 'totalStock' | 'availableStock'>,
  initialAllocation?: {
    branchId: string;
    branchName: string;
    warehouseId: string;
    warehouseName: string;
    locationId: string;
    locationCode: string;
    quantity: number;
    user: { id: string; name: string };
  }
): Promise<string> {
  const partId = `part_${partData.partNumber.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}`;
  const now = new Date().toISOString();
  const initQty = initialAllocation ? initialAllocation.quantity : 0;

  const partRecord: PartMaster = {
    ...partData,
    id: partId,
    partNumber: partData.partNumber.trim().toUpperCase(),
    totalStock: initQty,
    availableStock: initQty,
    createdAt: now,
    updatedAt: now
  };

  const batch = writeBatch(db);
  batch.set(doc(db, PARTS_COL, partId), partRecord);

  if (initialAllocation && initialAllocation.quantity > 0) {
    const invId = `inv_${partRecord.partNumber}_${initialAllocation.locationCode.replace(/[^a-zA-Z0-9]/g, '')}`;
    const invRecord: InventoryItem = {
      id: invId,
      partId: partId,
      partNumber: partRecord.partNumber,
      partNameEn: partRecord.nameEn,
      partNameAr: partRecord.nameAr,
      branchId: initialAllocation.branchId,
      branchName: initialAllocation.branchName,
      warehouseId: initialAllocation.warehouseId,
      warehouseName: initialAllocation.warehouseName,
      locationId: initialAllocation.locationId,
      locationCode: initialAllocation.locationCode,
      quantity: initialAllocation.quantity,
      reservedQuantity: 0,
      availableQuantity: initialAllocation.quantity,
      costPrice: partRecord.costPrice,
      sellingPrice: partRecord.sellingPrice,
      lastMovementDate: now,
      updatedAt: now
    };
    batch.set(doc(db, INVENTORY_COL, invId), invRecord);

    const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const movRecord: StockMovement = {
      id: movId,
      partId: partId,
      partNumber: partRecord.partNumber,
      partName: partRecord.nameEn,
      movementType: 'INITIAL_STOCK',
      quantity: initialAllocation.quantity,
      previousQuantity: 0,
      newQuantity: initialAllocation.quantity,
      branchId: initialAllocation.branchId,
      branchName: initialAllocation.branchName,
      warehouseId: initialAllocation.warehouseId,
      warehouseName: initialAllocation.warehouseName,
      destinationLocation: initialAllocation.locationCode,
      reference: 'PART-INITIALIZATION',
      reason: 'Part Master registration and initial bin placement',
      userId: initialAllocation.user.id,
      userName: initialAllocation.user.name,
      timestamp: now
    };
    batch.set(doc(db, MOVEMENTS_COL, movId), movRecord);
  }

  const auditId = `audit_${Date.now()}`;
  batch.set(doc(db, AUDIT_LOGS_COL, auditId), {
    id: auditId,
    userId: initialAllocation?.user.id || 'admin',
    userName: initialAllocation?.user.name || 'المدير العام',
    action: 'CREATE_PART',
    entity: 'PartMaster',
    entityId: partId,
    details: `Created Part ${partRecord.partNumber} (${partRecord.nameAr}) with initial stock ${initQty}`,
    timestamp: now
  });

  await batch.commit();
  return partId;
}

export async function updatePart(id: string, updates: Partial<PartMaster>, user?: { id: string; name: string }): Promise<void> {
  const partRef = doc(db, PARTS_COL, id);
  const now = new Date().toISOString();
  await updateDoc(partRef, {
    ...updates,
    updatedAt: now
  });

  if (user) {
    await addDoc(collection(db, AUDIT_LOGS_COL), {
      userId: user.id,
      userName: user.name,
      action: 'UPDATE_PART',
      entity: 'PartMaster',
      entityId: id,
      details: `Updated part details for ${updates.partNumber || id}`,
      timestamp: now
    });
  }
}

export async function deletePart(id: string, user?: { id: string; name: string }): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // 1. Delete part master doc
  batch.delete(doc(db, PARTS_COL, id));

  // 2. Delete matching inventory documents
  const invSnap = await getDocs(query(collection(db, INVENTORY_COL), where('partId', '==', id)));
  invSnap.forEach((d) => batch.delete(d.ref));

  // 3. Record Audit log
  const auditId = `audit_del_${Date.now()}`;
  batch.set(doc(db, AUDIT_LOGS_COL, auditId), {
    id: auditId,
    userId: user?.id || 'admin',
    userName: user?.name || 'المدير العام',
    action: 'DELETE_PART',
    entity: 'PartMaster',
    entityId: id,
    details: `Deleted Part ${id} and all related inventory records`,
    timestamp: now
  });

  await batch.commit();
}

// ----------------------------------------------------
// INVENTORY & STOCK MOVEMENT SERVICE
// ----------------------------------------------------

export function subscribeInventory(callback: (items: InventoryItem[]) => void) {
  const q = query(collection(db, INVENTORY_COL));
  return onSnapshot(q, (snapshot) => {
    const items: InventoryItem[] = [];
    snapshot.forEach((d) => {
      items.push({ id: d.id, ...(d.data() as Omit<InventoryItem, 'id'>) });
    });
    callback(items);
  }, (err) => {
    console.warn('Firestore inventory subscription error:', err);
    callback([]);
  });
}

export function subscribeStockMovements(callback: (movements: StockMovement[]) => void) {
  const q = query(collection(db, MOVEMENTS_COL));
  return onSnapshot(q, (snapshot) => {
    const list: StockMovement[] = [];
    snapshot.forEach((d) => {
      list.push({ id: d.id, ...(d.data() as Omit<StockMovement, 'id'>) });
    });
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(list);
  }, (err) => {
    console.warn('Firestore movements error:', err);
    callback([]);
  });
}

export async function deleteStockMovement(id: string): Promise<void> {
  await deleteDoc(doc(db, MOVEMENTS_COL, id));
}

/**
 * Execute Stock Movement / Inventory Adjustment atomically with audit ledger
 */
export async function executeStockMovement(params: {
  part: PartMaster;
  movementType: MovementType;
  quantityDelta: number;
  branch: Branch;
  warehouse: Warehouse;
  location: WarehouseLocation;
  targetLocation?: WarehouseLocation;
  reference?: string;
  reason: string;
  user: { id: string; name: string };
}): Promise<void> {
  const { part, movementType, quantityDelta, branch, warehouse, location, targetLocation, reference, reason, user } = params;
  const now = new Date().toISOString();
  const batch = writeBatch(db);

  // 1. Find existing inventory in this source location
  const invQuery = query(
    collection(db, INVENTORY_COL),
    where('partId', '==', part.id),
    where('locationId', '==', location.id)
  );
  const invSnap = await getDocs(invQuery);

  let currentSourceQty = 0;
  let sourceInvRef: ReturnType<typeof doc>;

  if (!invSnap.empty) {
    const existingDoc = invSnap.docs[0];
    sourceInvRef = existingDoc.ref;
    currentSourceQty = existingDoc.data().quantity || 0;
  } else {
    const newInvId = `inv_${part.partNumber}_${location.code.replace(/[^a-zA-Z0-9]/g, '')}`;
    sourceInvRef = doc(db, INVENTORY_COL, newInvId);
  }

  const requestedQty = Math.abs(quantityDelta);
  const isOutbound = ['SALE', 'DAMAGED', 'LOST', 'SUPPLIER_RETURN'].includes(movementType);
  if (requestedQty <= 0) {
    throw new Error('يجب أن تكون كمية الحركة أكبر من الصفر.');
  }
  if ((isOutbound || movementType === 'TRANSFER') && currentSourceQty < requestedQty) {
    throw new Error(`الرصيد المتاح في الرف ${location.code} هو ${currentSourceQty} فقط، ولا يكفي لتنفيذ الحركة.`);
  }

  let newSourceQty = currentSourceQty;

  if (movementType === 'TRANSFER' && targetLocation) {
    newSourceQty = Math.max(0, currentSourceQty - Math.abs(quantityDelta));
    
    batch.set(sourceInvRef, {
      id: sourceInvRef.id,
      partId: part.id,
      partNumber: part.partNumber,
      partNameEn: part.nameEn,
      partNameAr: part.nameAr,
      branchId: branch.id,
      branchName: branch.name,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      locationId: location.id,
      locationCode: location.code,
      quantity: newSourceQty,
      reservedQuantity: 0,
      availableQuantity: newSourceQty,
      costPrice: part.costPrice,
      sellingPrice: part.sellingPrice,
      lastMovementDate: now,
      updatedAt: now
    }, { merge: true });

    const targetInvQuery = query(
      collection(db, INVENTORY_COL),
      where('partId', '==', part.id),
      where('locationId', '==', targetLocation.id)
    );
    const targetSnap = await getDocs(targetInvQuery);
    let currentTargetQty = 0;
    let targetInvRef: ReturnType<typeof doc>;

    if (!targetSnap.empty) {
      targetInvRef = targetSnap.docs[0].ref;
      currentTargetQty = targetSnap.docs[0].data().quantity || 0;
    } else {
      const targetInvId = `inv_${part.partNumber}_${targetLocation.code.replace(/[^a-zA-Z0-9]/g, '')}`;
      targetInvRef = doc(db, INVENTORY_COL, targetInvId);
    }

    const newTargetQty = currentTargetQty + Math.abs(quantityDelta);
    batch.set(targetInvRef, {
      id: targetInvRef.id,
      partId: part.id,
      partNumber: part.partNumber,
      partNameEn: part.nameEn,
      partNameAr: part.nameAr,
      branchId: targetLocation.branchId || branch.id,
      branchName: branch.name,
      warehouseId: targetLocation.warehouseId || warehouse.id,
      warehouseName: targetLocation.warehouseName || warehouse.name,
      locationId: targetLocation.id,
      locationCode: targetLocation.code,
      quantity: newTargetQty,
      reservedQuantity: 0,
      availableQuantity: newTargetQty,
      costPrice: part.costPrice,
      sellingPrice: part.sellingPrice,
      lastMovementDate: now,
      updatedAt: now
    }, { merge: true });

  } else {
    newSourceQty = Math.max(0, currentSourceQty + quantityDelta);
    batch.set(sourceInvRef, {
      id: sourceInvRef.id,
      partId: part.id,
      partNumber: part.partNumber,
      partNameEn: part.nameEn,
      partNameAr: part.nameAr,
      branchId: branch.id,
      branchName: branch.name,
      warehouseId: warehouse.id,
      warehouseName: warehouse.name,
      locationId: location.id,
      locationCode: location.code,
      quantity: newSourceQty,
      reservedQuantity: 0,
      availableQuantity: newSourceQty,
      costPrice: part.costPrice,
      sellingPrice: part.sellingPrice,
      lastMovementDate: now,
      updatedAt: now
    }, { merge: true });
  }

  // 2. Record Movement Ledger
  const movId = `mov_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const movRecord: StockMovement = {
    id: movId,
    partId: part.id,
    partNumber: part.partNumber,
    partName: part.nameAr || part.nameEn,
    movementType,
    quantity: quantityDelta,
    previousQuantity: currentSourceQty,
    newQuantity: newSourceQty,
    branchId: branch.id,
    branchName: branch.name,
    warehouseId: warehouse.id,
    warehouseName: warehouse.name,
    sourceLocation: location.code,
    destinationLocation: targetLocation ? targetLocation.code : location.code,
    reference: reference || `REF-${Date.now().toString().slice(-6)}`,
    reason,
    userId: user.id,
    userName: user.name,
    timestamp: now
  };
  batch.set(doc(db, MOVEMENTS_COL, movId), movRecord);

  // 3. Update Part Master totalStock
  const netPartDelta = movementType === 'TRANSFER' ? 0 : quantityDelta;
  const newPartTotalStock = Math.max(0, (part.totalStock || 0) + netPartDelta);
  batch.update(doc(db, PARTS_COL, part.id), {
    totalStock: newPartTotalStock,
    availableStock: newPartTotalStock,
    updatedAt: now
  });

  // 4. Audit Log
  const auditId = `audit_${Date.now()}`;
  batch.set(doc(db, AUDIT_LOGS_COL, auditId), {
    id: auditId,
    userId: user.id,
    userName: user.name,
    action: movementType,
    entity: 'Inventory',
    entityId: part.partNumber,
    details: `${movementType} of ${Math.abs(quantityDelta)} units for ${part.partNumber} by ${user.name}`,
    timestamp: now
  });

  await batch.commit();
}

// ----------------------------------------------------
// BRANCHES, WAREHOUSES & LOCATIONS SERVICE
// ----------------------------------------------------

export function subscribeBranches(callback: (branches: Branch[]) => void) {
  const q = query(collection(db, BRANCHES_COL));
  return onSnapshot(q, (snapshot) => {
    const list: Branch[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Branch, 'id'>) }));
    callback(list.length > 0 ? list : INITIAL_BRANCHES);
  }, () => callback(INITIAL_BRANCHES));
}

export function subscribeWarehouses(callback: (warehouses: Warehouse[]) => void) {
  const q = query(collection(db, WAREHOUSES_COL));
  return onSnapshot(q, (snapshot) => {
    const list: Warehouse[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Warehouse, 'id'>) }));
    callback(list.length > 0 ? list : INITIAL_WAREHOUSES);
  }, () => callback(INITIAL_WAREHOUSES));
}

export async function createWarehouse(whData: Omit<Warehouse, 'id' | 'createdAt'>): Promise<string> {
  const code = whData.code || 'WH';
  const id = `wh_${code.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`;
  const now = new Date().toISOString();
  await setDoc(doc(db, WAREHOUSES_COL, id), {
    ...whData,
    id,
    active: whData.active !== false,
    createdAt: now
  });
  return id;
}

export async function updateWarehouse(id: string, updates: Partial<Warehouse>): Promise<void> {
  await updateDoc(doc(db, WAREHOUSES_COL, id), updates);
}

export async function deleteWarehouse(id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, WAREHOUSES_COL, id));
  
  // Also delete associated locations
  const locSnap = await getDocs(query(collection(db, LOCATIONS_COL), where('warehouseId', '==', id)));
  locSnap.forEach(d => batch.delete(d.ref));
  
  await batch.commit();
}

export function subscribeLocations(callback: (locations: WarehouseLocation[]) => void) {
  const q = query(collection(db, LOCATIONS_COL));
  return onSnapshot(q, (snapshot) => {
    const list: WarehouseLocation[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<WarehouseLocation, 'id'>) }));
    callback(list.length > 0 ? list : INITIAL_LOCATIONS);
  }, () => callback(INITIAL_LOCATIONS));
}

export async function createWarehouseLocation(locData: Omit<WarehouseLocation, 'id' | 'createdAt'>): Promise<string> {
  const locId = `loc_${locData.code.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}_${Date.now()}`;
  const now = new Date().toISOString();
  await setDoc(doc(db, LOCATIONS_COL, locId), {
    ...locData,
    id: locId,
    currentUnits: locData.currentUnits || 0,
    createdAt: now
  });
  return locId;
}

export async function updateWarehouseLocation(id: string, updates: Partial<WarehouseLocation>): Promise<void> {
  await updateDoc(doc(db, LOCATIONS_COL, id), updates);
}

export async function deleteWarehouseLocation(id: string): Promise<void> {
  await deleteDoc(doc(db, LOCATIONS_COL, id));
}

export async function clearAllLocations(): Promise<void> {
  const snap = await getDocs(collection(db, LOCATIONS_COL));
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function clearAllMovements(): Promise<void> {
  const snap = await getDocs(collection(db, MOVEMENTS_COL));
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function clearAllPurchaseOrders(): Promise<void> {
  const snap = await getDocs(collection(db, PURCHASE_ORDERS_COL));
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function clearAllSalesInvoices(): Promise<void> {
  const snap = await getDocs(collection(db, SALES_INVOICES_COL));
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export async function clearAllShortages(): Promise<void> {
  const snap = await getDocs(collection(db, SHORTAGES_COL));
  if (!snap.empty) {
    const batch = writeBatch(db);
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
}

export function subscribeCategories(callback: (categories: EpcCategory[]) => void) {
  const q = query(collection(db, CATEGORIES_COL));
  return onSnapshot(q, (snapshot) => {
    const list: EpcCategory[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<EpcCategory, 'id'>) }));
    callback(list.length > 0 ? list : INITIAL_EPC_CATEGORIES);
  }, () => callback(INITIAL_EPC_CATEGORIES));
}

export async function createCategory(cat: Omit<EpcCategory, 'id'>): Promise<string> {
  const code = (cat as any).code || (cat as any).groupCode || 'CAT';
  const id = `cat_${code}_${Date.now()}`;
  await setDoc(doc(db, CATEGORIES_COL, id), {
    ...cat,
    groupCode: code,
    code,
    id
  });
  return id;
}

export const addEpcCategory = createCategory;

export async function updateCategory(id: string, updates: Partial<EpcCategory>): Promise<void> {
  await updateDoc(doc(db, CATEGORIES_COL, id), updates);
}

export const updateEpcCategory = updateCategory;

export async function deleteCategory(id: string): Promise<void> {
  await deleteDoc(doc(db, CATEGORIES_COL, id));
}

export const deleteEpcCategory = deleteCategory;

export function recommendOptimalBinLocation(
  categoryOrPart: string | PartMaster,
  locations: WarehouseLocation[],
  _inventory: InventoryItem[] = []
): WarehouseLocation | null {
  if (!locations || locations.length === 0) return null;
  const activeLocations = locations.filter(l => l.status === 'ACTIVE' || (l as any).isActive !== false);
  return activeLocations[0] || locations[0] || null;
}

export function subscribeAuditLogs(callback: (logs: AuditLog[]) => void) {
  const q = query(collection(db, AUDIT_LOGS_COL));
  return onSnapshot(q, (snapshot) => {
    const list: AuditLog[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<AuditLog, 'id'>) }));
    list.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    callback(list);
  }, () => callback([]));
}

// ---------------------------------------------------------------------------
// Shortages Management
// ---------------------------------------------------------------------------

export function subscribeShortages(callback: (shortages: ShortageItem[]) => void) {
  const q = query(collection(db, SHORTAGES_COL));
  return onSnapshot(q, (snapshot) => {
    const list: ShortageItem[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<ShortageItem, 'id'>) }));
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    callback(list);
  }, (err) => {
    console.warn('Firestore shortages error:', err);
    callback([]);
  });
}

export async function addShortageItem(item: Omit<ShortageItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const id = `sh_${Date.now()}`;
  const now = new Date().toISOString();
  await setDoc(doc(db, SHORTAGES_COL, id), {
    ...item,
    id,
    createdAt: now,
    updatedAt: now
  });
  return id;
}

export async function updateShortageItem(id: string, updates: Partial<ShortageItem>): Promise<void> {
  const now = new Date().toISOString();
  await updateDoc(doc(db, SHORTAGES_COL, id), {
    ...updates,
    updatedAt: now
  });
}

export async function updateShortageStatus(id: string, status: ShortageItem['status'], notes?: string): Promise<void> {
  const now = new Date().toISOString();
  const updateData: any = { status, updatedAt: now };
  if (notes !== undefined) updateData.notes = notes;
  await updateDoc(doc(db, SHORTAGES_COL, id), updateData);
}

export async function deleteShortageItem(id: string): Promise<void> {
  await deleteDoc(doc(db, SHORTAGES_COL, id));
}

// ---------------------------------------------------------------------------
// Suppliers & Customers Management
// ---------------------------------------------------------------------------

export function subscribeSuppliers(callback: (suppliers: Supplier[]) => void) {
  const q = query(collection(db, SUPPLIERS_COL));
  return onSnapshot(q, (snapshot) => {
    const list: Supplier[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Supplier, 'id'>) }));
    callback(list);
  }, () => callback([]));
}

export async function addSupplier(supplier: Omit<Supplier, 'id' | 'createdAt'>): Promise<string> {
  const id = `sup_${Date.now()}`;
  await setDoc(doc(db, SUPPLIERS_COL, id), {
    ...supplier,
    id,
    createdAt: new Date().toISOString()
  });
  return id;
}

export async function updateSupplier(id: string, updates: Partial<Supplier>): Promise<void> {
  await updateDoc(doc(db, SUPPLIERS_COL, id), updates);
}

export async function deleteSupplier(id: string): Promise<void> {
  await deleteDoc(doc(db, SUPPLIERS_COL, id));
}

export function subscribeCustomers(callback: (customers: Customer[]) => void) {
  const q = query(collection(db, CUSTOMERS_COL));
  return onSnapshot(q, (snapshot) => {
    const list: Customer[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<Customer, 'id'>) }));
    callback(list);
  }, () => callback([]));
}

export async function addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<string> {
  const id = `cust_${Date.now()}`;
  await setDoc(doc(db, CUSTOMERS_COL, id), {
    ...customer,
    id,
    createdAt: new Date().toISOString()
  });
  return id;
}

export async function updateCustomer(id: string, updates: Partial<Customer>): Promise<void> {
  await updateDoc(doc(db, CUSTOMERS_COL, id), updates);
}

export async function deleteCustomer(id: string): Promise<void> {
  await deleteDoc(doc(db, CUSTOMERS_COL, id));
}

// ---------------------------------------------------------------------------
// Purchases (Purchase Orders) — Receiving increases stock
// ---------------------------------------------------------------------------

export function subscribePurchaseOrders(callback: (pos: PurchaseOrder[]) => void) {
  const q = query(collection(db, PURCHASE_ORDERS_COL));
  return onSnapshot(q, (snapshot) => {
    const list: PurchaseOrder[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<PurchaseOrder, 'id'>) }));
    list.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    callback(list);
  }, () => callback([]));
}

export async function createPurchaseOrder(po: Omit<PurchaseOrder, 'id'>): Promise<string> {
  const id = `po_${Date.now()}`;
  await setDoc(doc(db, PURCHASE_ORDERS_COL, id), {
    ...po,
    id
  });
  return id;
}

export async function updatePurchaseOrder(id: string, updates: Partial<PurchaseOrder>): Promise<void> {
  await updateDoc(doc(db, PURCHASE_ORDERS_COL, id), updates);
}

export async function deletePurchaseOrder(id: string): Promise<void> {
  await deleteDoc(doc(db, PURCHASE_ORDERS_COL, id));
}

export async function receivePurchaseOrder(
  po: PurchaseOrder,
  user: { id: string; name: string }
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  const poRef = doc(db, PURCHASE_ORDERS_COL, po.id);
  const currentPoSnap = await getDoc(poRef);
  if (!currentPoSnap.exists()) {
    throw new Error('أمر الشراء غير موجود.');
  }
  const currentPo = currentPoSnap.data() as PurchaseOrder;
  if (currentPo.status !== 'ORDERED') {
    throw new Error('تم استلام أمر الشراء هذا مسبقًا أو لم يعد صالحًا للاستلام.');
  }
  batch.update(poRef, {
    status: 'RECEIVED',
    receivedDate: now
  });

  for (const item of po.items) {
    const invId = `inv_${item.partId}_${item.locationCode.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const invRef = doc(db, INVENTORY_COL, invId);
    const invSnap = await getDoc(invRef);

    let prevQty = 0;
    if (invSnap.exists()) {
      const invData = invSnap.data() as InventoryItem;
      prevQty = invData.quantity || 0;
      const newQty = prevQty + item.quantity;
      batch.update(invRef, {
        quantity: newQty,
        availableQuantity: newQty - (invData.reservedQuantity || 0),
        costPrice: item.costPrice,
        lastMovementDate: now,
        updatedAt: now
      });
    } else {
      batch.set(invRef, {
        id: invId,
        partId: item.partId,
        partNumber: item.partNumber,
        partNameAr: item.nameAr,
        partNameEn: item.nameAr,
        branchId: po.branchId,
        warehouseId: po.warehouseId,
        locationId: `loc_${item.locationCode.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()}`,
        locationCode: item.locationCode,
        quantity: item.quantity,
        reservedQuantity: 0,
        availableQuantity: item.quantity,
        costPrice: item.costPrice,
        sellingPrice: Math.round(item.costPrice * 1.35),
        lastMovementDate: now,
        updatedAt: now
      });
    }

    const partRef = doc(db, PARTS_COL, item.partId);
    const partSnap = await getDoc(partRef);
    if (partSnap.exists()) {
      const partData = partSnap.data() as PartMaster;
      const updatedTotal = (partData.totalStock || 0) + item.quantity;
      batch.update(partRef, {
        totalStock: updatedTotal,
        availableStock: updatedTotal,
        costPrice: item.costPrice,
        updatedAt: now
      });
    }

    const movId = `mov_po_${Date.now()}_${item.partNumber}`;
    const movRef = doc(db, MOVEMENTS_COL, movId);
    const movement: StockMovement = {
      id: movId,
      partId: item.partId,
      partNumber: item.partNumber,
      partName: item.nameAr,
      movementType: 'PURCHASE',
      quantity: item.quantity,
      previousQuantity: prevQty,
      newQuantity: prevQty + item.quantity,
      branchId: po.branchId,
      warehouseId: po.warehouseId,
      destinationLocation: item.locationCode,
      reference: po.poNumber,
      reason: `استلام أمر توريد مشتريات #${po.poNumber} من المورد ${po.supplierName}`,
      userId: user.id,
      userName: user.name,
      timestamp: now
    };
    batch.set(movRef, movement);
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// Sales (Sales Invoices) — Selling decreases stock
// ---------------------------------------------------------------------------

export function subscribeSalesInvoices(callback: (invoices: SalesInvoice[]) => void) {
  const q = query(collection(db, SALES_INVOICES_COL));
  return onSnapshot(q, (snapshot) => {
    const list: SalesInvoice[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<SalesInvoice, 'id'>) }));
    list.sort((a, b) => new Date(b.createdDate).getTime() - new Date(a.createdDate).getTime());
    callback(list);
  }, () => callback([]));
}

export async function createSalesInvoice(
  invoice: Omit<SalesInvoice, 'id'>,
  user: { id: string; name: string }
): Promise<string> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();
  if (invoice.items.length === 0) {
    throw new Error('لا يمكن إصدار فاتورة بدون أصناف.');
  }

  const requestedByLocation = new Map<string, number>();
  for (const item of invoice.items) {
    if (item.quantity <= 0 || !Number.isFinite(item.quantity)) {
      throw new Error(`الكمية غير صالحة للصنف ${item.partNumber}.`);
    }
    const key = `${item.partId}::${item.locationCode}`;
    requestedByLocation.set(key, (requestedByLocation.get(key) || 0) + item.quantity);
  }

  for (const [key, requestedQty] of requestedByLocation) {
    const [partId, locationCode] = key.split('::');
    const invId = `inv_${partId}_${locationCode.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const invSnap = await getDoc(doc(db, INVENTORY_COL, invId));
    const availableQty = invSnap.exists() ? Number(invSnap.data().quantity || 0) : 0;
    if (availableQty < requestedQty) {
      throw new Error(`الرصيد المتاح للصنف في الرف ${locationCode} هو ${availableQty} فقط.`);
    }
  }

  const invoiceId = `inv_sale_${Date.now()}`;
  const invDocRef = doc(db, SALES_INVOICES_COL, invoiceId);

  batch.set(invDocRef, {
    ...invoice,
    id: invoiceId
  });

  for (const item of invoice.items) {
    const invId = `inv_${item.partId}_${item.locationCode.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const invRef = doc(db, INVENTORY_COL, invId);
    const invSnap = await getDoc(invRef);

    let prevQty = 0;
    if (invSnap.exists()) {
      const invData = invSnap.data() as InventoryItem;
      prevQty = invData.quantity || 0;
      const newQty = Math.max(0, prevQty - item.quantity);
      batch.update(invRef, {
        quantity: newQty,
        availableQuantity: Math.max(0, newQty - (invData.reservedQuantity || 0)),
        lastMovementDate: now,
        updatedAt: now
      });
    }

    const partRef = doc(db, PARTS_COL, item.partId);
    const partSnap = await getDoc(partRef);
    if (partSnap.exists()) {
      const partData = partSnap.data() as PartMaster;
      const updatedTotal = Math.max(0, (partData.totalStock || 0) - item.quantity);
      batch.update(partRef, {
        totalStock: updatedTotal,
        availableStock: updatedTotal,
        updatedAt: now
      });

      if (updatedTotal <= partData.minStock) {
        const shortageRef = doc(db, SHORTAGES_COL, `sh_auto_${item.partNumber}`);
        batch.set(shortageRef, {
          id: `sh_auto_${item.partNumber}`,
          partNumber: item.partNumber,
          nameAr: item.nameAr,
          nameEn: partData.nameEn,
          chassis: partData.compatibility?.[0]?.chassis || '',
          requestedQty: partData.reorderLevel || 5,
          requestCount: 1,
          urgency: updatedTotal === 0 ? 'HIGH' : 'MEDIUM',
          customerName: invoice.customerName,
          customerPhone: invoice.customerPhone,
          status: 'PENDING',
          notes: `انخفض الرصيد إلى ${updatedTotal} بعد الفاتورة #${invoice.invoiceNumber}`,
          createdAt: now,
          updatedAt: now
        });
      }
    }

    const movId = `mov_sale_${Date.now()}_${item.partNumber}`;
    const movRef = doc(db, MOVEMENTS_COL, movId);
    const movement: StockMovement = {
      id: movId,
      partId: item.partId,
      partNumber: item.partNumber,
      partName: item.nameAr,
      movementType: 'SALE',
      quantity: -item.quantity,
      previousQuantity: prevQty,
      newQuantity: Math.max(0, prevQty - item.quantity),
      branchId: invoice.branchId,
      warehouseId: invoice.warehouseId,
      sourceLocation: item.locationCode,
      reference: invoice.invoiceNumber,
      reason: `صرف مبيعات للعميل ${invoice.customerName} بموجب فاتورة #${invoice.invoiceNumber}`,
      userId: user.id,
      userName: user.name,
      timestamp: now
    };
    batch.set(movRef, movement);
  }

  await batch.commit();
  return invoiceId;
}

export async function updateSalesInvoice(id: string, updates: Partial<SalesInvoice>): Promise<void> {
  await updateDoc(doc(db, SALES_INVOICES_COL, id), updates);
}

export async function deleteSalesInvoice(id: string): Promise<void> {
  throw new Error('لا يمكن حذف فاتورة مبيعات مكتملة؛ استخدم إجراء مرتجع يعكس حركة المخزون.');
}

// ---------------------------------------------------------------------------
// Stocktake Sessions (الجرد والتسويات)
// ---------------------------------------------------------------------------

export function subscribeStocktakeSessions(callback: (sessions: StocktakeSession[]) => void) {
  const q = query(collection(db, STOCKTAKE_COL));
  return onSnapshot(q, (snapshot) => {
    const list: StocktakeSession[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<StocktakeSession, 'id'>) }));
    list.sort((a, b) => new Date(b.conductedAt).getTime() - new Date(a.conductedAt).getTime());
    callback(list);
  }, () => callback([]));
}

export async function approveStocktakeSession(
  session: StocktakeSession,
  approver: { id: string; name: string }
): Promise<void> {
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  const sessRef = doc(db, STOCKTAKE_COL, session.id);
  batch.update(sessRef, {
    status: 'COMPLETED',
    approvedAt: now
  });

  for (const item of session.items) {
    if (item.variance !== 0) {
      const invId = `inv_${item.partId}_${item.locationCode.replace(/[^a-zA-Z0-9]/g, '_')}`;
      const invRef = doc(db, INVENTORY_COL, invId);
      
      batch.update(invRef, {
        quantity: item.countedQty,
        availableQuantity: item.countedQty,
        lastMovementDate: now,
        updatedAt: now
      });

      const partRef = doc(db, PARTS_COL, item.partId);
      const partSnap = await getDoc(partRef);
      if (partSnap.exists()) {
        const partData = partSnap.data() as PartMaster;
        const newTotal = (partData.totalStock || 0) + item.variance;
        batch.update(partRef, {
          totalStock: Math.max(0, newTotal),
          availableStock: Math.max(0, newTotal),
          updatedAt: now
        });
      }

      const movId = `mov_adj_${Date.now()}_${item.partNumber}`;
      const movRef = doc(db, MOVEMENTS_COL, movId);
      batch.set(movRef, {
        id: movId,
        partId: item.partId,
        partNumber: item.partNumber,
        partName: item.partName,
        movementType: 'ADJUSTMENT',
        quantity: item.variance,
        previousQuantity: item.systemQty,
        newQuantity: item.countedQty,
        branchId: 'branch_elharefeyin',
        warehouseId: 'wh_elharefeyin_main',
        destinationLocation: item.locationCode,
        reference: `STOCKTAKE-${session.zone}`,
        reason: `تسوية جرد فعلي بالمنطقة ${session.zone} — الفارق: ${item.variance > 0 ? '+' : ''}${item.variance}`,
        userId: approver.id,
        userName: approver.name,
        timestamp: now
      });
    }
  }

  await batch.commit();
}

// ---------------------------------------------------------------------------
// VIN Lookups History
// ---------------------------------------------------------------------------

export function subscribeVinLookups(callback: (lookups: VinDecodeResult[]) => void) {
  const q = query(collection(db, VIN_LOOKUPS_COL));
  return onSnapshot(q, (snapshot) => {
    const list: VinDecodeResult[] = [];
    snapshot.forEach((d) => list.push({ id: d.id, ...(d.data() as Omit<VinDecodeResult, 'id'>) }));
    list.sort((a, b) => new Date(b.decodedAt).getTime() - new Date(a.decodedAt).getTime());
    callback(list);
  }, () => callback([]));
}

export async function saveVinLookup(result: VinDecodeResult): Promise<string> {
  const id = `vin_${result.vin}_${Date.now()}`;
  await setDoc(doc(db, VIN_LOOKUPS_COL, id), {
    ...result,
    id
  });
  return id;
}
