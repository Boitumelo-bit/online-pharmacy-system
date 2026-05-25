const prisma = require('../config/prisma');

async function seedRealData() {
  console.log('🌱 Seeding REAL pharmacy data...');

  // Create REAL Categories (using upsert to avoid duplicates)
  const categoryData = [
    { name: 'Pain Relief', slug: 'pain-relief', description: 'Medicines for pain and fever relief' },
    { name: 'Antibiotics', slug: 'antibiotics', description: 'Medicines that fight bacterial infections' },
    { name: 'Vitamins', slug: 'vitamins', description: 'Dietary supplements for health' },
    { name: 'Cold & Flu', slug: 'cold-flu', description: 'Medicines for cold and flu symptoms' },
    { name: 'Allergy', slug: 'allergy', description: 'Medicines for allergic reactions' },
    { name: 'Skin Care', slug: 'skin-care', description: 'Topical treatments for skin conditions' },
    { name: 'Diabetes', slug: 'diabetes', description: 'Medicines for diabetes management' },
    { name: 'Blood Pressure', slug: 'blood-pressure', description: 'Medicines for hypertension' },
  ];

  for (const cat of categoryData) {
    const result = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
    console.log(`✅ Category ready: ${result.name}`);
  }

  // Get category IDs
  const allCategories = await prisma.category.findMany();
  const categoryMap = {};
  allCategories.forEach(c => { categoryMap[c.name] = c.id; });

  // Create REAL Medicines (using upsert to avoid duplicates)
  const medicines = [
    {
      name: 'Paracetamol 500mg',
      description: 'Effective pain reliever and fever reducer. Used for headaches, muscle aches, arthritis, backaches, toothaches, colds, and fevers.',
      dosage: 'Adults: 1-2 tablets every 4-6 hours as needed. Maximum 8 tablets in 24 hours.',
      sideEffects: 'Rare. May include nausea, stomach pain, loss of appetite.',
      categoryName: 'Pain Relief',
      price: 5.99,
      discount: 0,
      stock: 500,
      batchNumber: 'PAR-2024-001',
      expiryDate: new Date('2025-12-31'),
      barcode: '8901234567890',
      prescriptionRequired: false,
      isFeatured: true,
    },
    {
      name: 'Ibuprofen 400mg',
      description: 'Nonsteroidal anti-inflammatory drug (NSAID) used to treat pain, fever, and inflammation.',
      dosage: 'Adults: 1 tablet every 6-8 hours as needed. Do not exceed 3 tablets in 24 hours.',
      sideEffects: 'Stomach upset, heartburn, nausea. Take with food.',
      categoryName: 'Pain Relief',
      price: 7.99,
      discount: 10,
      stock: 350,
      batchNumber: 'IBU-2024-002',
      expiryDate: new Date('2025-10-31'),
      barcode: '8901234567891',
      prescriptionRequired: false,
      isFeatured: true,
    },
    {
      name: 'Amoxicillin 500mg',
      description: 'Penicillin antibiotic used to treat bacterial infections including pneumonia, bronchitis, tonsillitis, and ear infections.',
      dosage: 'Adults: 1 capsule every 8 hours for 7-10 days. Complete full course.',
      sideEffects: 'Diarrhea, nausea, rash, vomiting. May cause allergic reactions.',
      categoryName: 'Antibiotics',
      price: 12.99,
      discount: 0,
      stock: 200,
      batchNumber: 'AMX-2024-003',
      expiryDate: new Date('2025-08-31'),
      barcode: '8901234567892',
      prescriptionRequired: true,
      isFeatured: false,
    },
    {
      name: 'Azithromycin 250mg',
      description: 'Macrolide antibiotic for respiratory infections, skin infections, ear infections, and STDs.',
      dosage: '2 tablets on first day, then 1 tablet daily for 4 days.',
      sideEffects: 'Diarrhea, nausea, abdominal pain, headache.',
      categoryName: 'Antibiotics',
      price: 18.99,
      discount: 5,
      stock: 150,
      batchNumber: 'AZM-2024-004',
      expiryDate: new Date('2025-09-30'),
      barcode: '8901234567893',
      prescriptionRequired: true,
      isFeatured: false,
    },
    {
      name: 'Vitamin C 1000mg',
      description: 'Immune system booster. Antioxidant that helps protect cells and supports immune function.',
      dosage: '1 tablet daily with food. Best taken in the morning.',
      sideEffects: 'Generally well tolerated. May cause mild stomach upset.',
      categoryName: 'Vitamins',
      price: 14.99,
      discount: 15,
      stock: 1000,
      batchNumber: 'VTC-2024-005',
      expiryDate: new Date('2026-01-31'),
      barcode: '8901234567894',
      prescriptionRequired: false,
      isFeatured: true,
    },
    {
      name: 'Vitamin D3 2000 IU',
      description: 'Essential for bone health, immune function, and calcium absorption.',
      dosage: '1 tablet daily. Best taken with a meal containing fat.',
      sideEffects: 'None when taken as directed.',
      categoryName: 'Vitamins',
      price: 11.99,
      discount: 0,
      stock: 800,
      batchNumber: 'VTD-2024-006',
      expiryDate: new Date('2026-02-28'),
      barcode: '8901234567895',
      prescriptionRequired: false,
      isFeatured: false,
    },
    {
      name: 'Losartan 50mg',
      description: 'Angiotensin II receptor blocker (ARB) for high blood pressure.',
      dosage: '1 tablet daily. Take at the same time each day.',
      sideEffects: 'Dizziness, fatigue, low blood pressure. May cause muscle pain.',
      categoryName: 'Blood Pressure',
      price: 22.99,
      discount: 0,
      stock: 120,
      batchNumber: 'LOS-2024-007',
      expiryDate: new Date('2025-11-30'),
      barcode: '8901234567896',
      prescriptionRequired: true,
      isFeatured: false,
    },
    {
      name: 'Amlodipine 5mg',
      description: 'Calcium channel blocker for high blood pressure and chest pain.',
      dosage: '1 tablet daily. May be taken with or without food.',
      sideEffects: 'Swelling ankles, fatigue, nausea, abdominal pain.',
      categoryName: 'Blood Pressure',
      price: 19.99,
      discount: 0,
      stock: 95,
      batchNumber: 'AML-2024-008',
      expiryDate: new Date('2025-10-31'),
      barcode: '8901234567897',
      prescriptionRequired: true,
      isFeatured: false,
    },
    {
      name: 'Metformin 500mg',
      description: 'First-line medication for type 2 diabetes. Controls blood sugar levels.',
      dosage: '1 tablet twice daily with meals.',
      sideEffects: 'Nausea, diarrhea, stomach upset. Usually improves over time.',
      categoryName: 'Diabetes',
      price: 15.99,
      discount: 0,
      stock: 180,
      batchNumber: 'MET-2024-009',
      expiryDate: new Date('2025-12-31'),
      barcode: '8901234567898',
      prescriptionRequired: true,
      isFeatured: false,
    },
    {
      name: 'Cetirizine 10mg',
      description: 'Antihistamine for seasonal allergies, hay fever, and hives.',
      dosage: '1 tablet daily. May cause drowsiness.',
      sideEffects: 'Drowsiness, dry mouth, fatigue, sore throat.',
      categoryName: 'Allergy',
      price: 8.99,
      discount: 0,
      stock: 400,
      batchNumber: 'CET-2024-010',
      expiryDate: new Date('2025-09-30'),
      barcode: '8901234567899',
      prescriptionRequired: false,
      isFeatured: false,
    },
  ];

  let addedCount = 0;
  let skippedCount = 0;

  for (const med of medicines) {
    const slug = med.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    
    // Check if medicine exists by slug or barcode
    const existing = await prisma.medicine.findFirst({
      where: {
        OR: [
          { slug: slug },
          { barcode: med.barcode }
        ]
      }
    });
    
    if (!existing) {
      await prisma.medicine.create({
        data: {
          name: med.name,
          slug: slug,
          description: med.description,
          dosage: med.dosage,
          sideEffects: med.sideEffects,
          categoryId: categoryMap[med.categoryName],
          price: med.price,
          discount: med.discount,
          stock: med.stock,
          batchNumber: med.batchNumber,
          expiryDate: med.expiryDate,
          barcode: med.barcode,
          prescriptionRequired: med.prescriptionRequired,
          isFeatured: med.isFeatured,
        }
      });
      console.log(`✅ Added medicine: ${med.name}`);
      addedCount++;
    } else {
      console.log(`⏭️ Skipped (exists): ${med.name}`);
      skippedCount++;
    }
  }

  console.log('\n📊 SEEDING SUMMARY:');
  console.log(`✅ Added: ${addedCount} new medicines`);
  console.log(`⏭️ Skipped: ${skippedCount} existing medicines`);
  console.log(`📦 Total categories: ${await prisma.category.count()}`);
  console.log(`💊 Total medicines: ${await prisma.medicine.count()}`);
  console.log('\n🎉 Seeding complete!');
}

seedRealData()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  });