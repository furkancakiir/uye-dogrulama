-- ============================================================
-- BAŞAKŞEHIR ÜYE DOĞRULAMA SİSTEMİ — SUPABASE SQL ŞEMASI
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın
-- ============================================================

-- 1) ADMINS (Görevli tablosu)
CREATE TABLE admins (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name TEXT,
    role TEXT DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2) MEMBERS (Üye tablosu)
CREATE TABLE members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    tc_hash TEXT UNIQUE NOT NULL,
    ad_soyad TEXT,
    mahalle TEXT,
    telefon TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3) QUERY LOGS (Sorgu kayıtları)
CREATE TABLE query_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id UUID REFERENCES admins(id),
    tc_hash TEXT NOT NULL,
    is_member BOOLEAN NOT NULL,
    queried_at TIMESTAMPTZ DEFAULT now()
);

-- İNDEXLER
CREATE INDEX idx_members_tc_hash ON members(tc_hash);
CREATE INDEX idx_query_logs_admin ON query_logs(admin_id);
CREATE INDEX idx_query_logs_date ON query_logs(queried_at);

-- ROW LEVEL SECURITY
ALTER TABLE admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE query_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read_admins" ON admins FOR SELECT USING (true);
CREATE POLICY "anon_insert_admins" ON admins FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_read_members" ON members FOR SELECT USING (true);
CREATE POLICY "anon_insert_members" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_insert_logs" ON query_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_read_logs" ON query_logs FOR SELECT USING (true);

-- ============================================================
-- İLK SUPERADMIN — admin / admin123
-- İlk girişten sonra şifreyi değiştirin!
-- ============================================================
INSERT INTO admins (username, password_hash, display_name, role)
VALUES (
    'admin',
    '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
    'Sistem Yöneticisi',
    'superadmin'
);
