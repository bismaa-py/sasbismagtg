--
-- PostgreSQL database dump
--

\restrict I5blfit6et7eOcN4jqjPqAcvwhmhjw2tPabZGgyMD7NBwYJ4yyAqtkIxsmIlLwm

-- Dumped from database version 18.4
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: log_surat_masuk_changes(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.log_surat_masuk_changes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   IF OLD.status_verifikasi IS DISTINCT FROM NEW.status_verifikasi THEN
      INSERT INTO log (id_user, aksi, tabel_terkait, kolom_terkait, id_data, values_old, values_new)
      VALUES (
         NEW.user_verifikasi,
         'UPDATE status_verifikasi',
         'surat_masuk',
         'status_verifikasi',
         NEW.id_surat_masuk,
         OLD.status_verifikasi,
         NEW.status_verifikasi
      );
   END IF;
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.log_surat_masuk_changes() OWNER TO postgres;

--
-- Name: set_dibaca_disposisi_penerima(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_dibaca_disposisi_penerima() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   IF NEW.status = 'dibaca' AND OLD.status != 'dibaca' THEN
      NEW.read_at = CURRENT_TIMESTAMP;
   END IF;
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_dibaca_disposisi_penerima() OWNER TO postgres;

--
-- Name: set_tanggal_dibaca(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_tanggal_dibaca() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   IF NEW.status = 'dibaca' AND OLD.status != 'dibaca' THEN
      NEW.tanggal_dibaca = CURRENT_TIMESTAMP;
   END IF;
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_tanggal_dibaca() OWNER TO postgres;

--
-- Name: set_waktu_baca_notif(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.set_waktu_baca_notif() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   IF NEW.is_read = true AND OLD.is_read = false THEN
      NEW.waktu_baca = CURRENT_TIMESTAMP;
   END IF;
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.set_waktu_baca_notif() OWNER TO postgres;

--
-- Name: update_disposisi_aktif(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_disposisi_aktif() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
   UPDATE surat_masuk 
   SET id_disposisi_aktif = NEW.id_disposisi
   WHERE id_surat_masuk = NEW.id_surat_masuk;
   
   RETURN NEW;
END;
$$;


ALTER FUNCTION public.update_disposisi_aktif() OWNER TO postgres;

--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: postgres
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$BEGIN    NEW.updated_at = CURRENT_TIMESTAMP;    RETURN NEW;END;$$;


ALTER FUNCTION public.update_updated_at_column() OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: disposisi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.disposisi (
    id_disposisi integer NOT NULL,
    tanggapan_saran text,
    proses_lanjut text,
    koordinasi_konfirmasi text,
    id_surat_masuk integer,
    id_kepsek integer,
    id_penerima integer,
    tanggal_disposisi timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status_disposisi character varying(50) DEFAULT 'belum_dibaca'::character varying,
    status_approval character varying(50) DEFAULT 'menunggu'::character varying,
    approval_at timestamp without time zone,
    catatan_kepsek text,
    id_jabatan_penerima integer,
    isi_disposisi text DEFAULT ''::text,
    batas_waktu text DEFAULT ''::text,
    catatan_waka text DEFAULT ''::text,
    id_waka integer,
    CONSTRAINT chk_status_approval CHECK (((status_approval)::text = ANY (ARRAY[('menunggu'::character varying)::text, ('disetujui'::character varying)::text, ('ditolak'::character varying)::text]))),
    CONSTRAINT disposisi_status_disposisi_check CHECK (((status_disposisi)::text = ANY (ARRAY[('belum_dibaca'::character varying)::text, ('dibaca'::character varying)::text, ('sedang_dikerjakan'::character varying)::text, ('selesai'::character varying)::text])))
);


ALTER TABLE public.disposisi OWNER TO postgres;

--
-- Name: disposisi_id_disposisi_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disposisi_id_disposisi_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disposisi_id_disposisi_seq OWNER TO postgres;

--
-- Name: disposisi_id_disposisi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disposisi_id_disposisi_seq OWNED BY public.disposisi.id_disposisi;


--
-- Name: distribusi_sm; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.distribusi_sm (
    id_penerima_disposisi integer CONSTRAINT disposisi_penerima_id_penerima_disposisi_not_null NOT NULL,
    id_disposisi integer CONSTRAINT disposisi_penerima_id_disposisi_not_null NOT NULL,
    id_user integer,
    id_jabatan integer,
    read_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'belum_dibaca'::character varying,
    id_waka integer,
    id_distribusi_parent integer,
    CONSTRAINT chk_xor_disposisi_penerima CHECK ((((id_user IS NOT NULL) AND (id_jabatan IS NULL)) OR ((id_user IS NULL) AND (id_jabatan IS NOT NULL)))),
    CONSTRAINT disposisi_penerima_status_check CHECK (((status)::text = ANY (ARRAY[('belum_dibaca'::character varying)::text, ('dibaca'::character varying)::text, ('diteruskan_waka'::character varying)::text, ('selesai'::character varying)::text])))
);


ALTER TABLE public.distribusi_sm OWNER TO postgres;

--
-- Name: disposisi_penerima_id_penerima_disposisi_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.disposisi_penerima_id_penerima_disposisi_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.disposisi_penerima_id_penerima_disposisi_seq OWNER TO postgres;

--
-- Name: disposisi_penerima_id_penerima_disposisi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.disposisi_penerima_id_penerima_disposisi_seq OWNED BY public.distribusi_sm.id_penerima_disposisi;


--
-- Name: distribusi_sk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.distribusi_sk (
    id_distribusi integer CONSTRAINT distribusi_surat_keluar_id_distribusi_not_null NOT NULL,
    id_sk integer CONSTRAINT distribusi_surat_keluar_id_surat_keluar_not_null NOT NULL,
    id_user integer,
    status character varying(50) DEFAULT 'belum_dibaca'::character varying,
    distribute_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    read_at timestamp without time zone,
    catatan text,
    id_jabatan integer,
    CONSTRAINT chk_xor_distribusi_penerima CHECK ((((id_user IS NOT NULL) AND (id_jabatan IS NULL)) OR ((id_user IS NULL) AND (id_jabatan IS NOT NULL)))),
    CONSTRAINT distribusi_surat_keluar_status_check CHECK (((status)::text = ANY (ARRAY[('belum_dibaca'::character varying)::text, ('dibaca'::character varying)::text, ('selesai'::character varying)::text])))
);


ALTER TABLE public.distribusi_sk OWNER TO postgres;

--
-- Name: distribusi_surat_keluar_id_distribusi_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.distribusi_surat_keluar_id_distribusi_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.distribusi_surat_keluar_id_distribusi_seq OWNER TO postgres;

--
-- Name: distribusi_surat_keluar_id_distribusi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.distribusi_surat_keluar_id_distribusi_seq OWNED BY public.distribusi_sk.id_distribusi;


--
-- Name: jabatan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.jabatan (
    id_jabatan integer NOT NULL,
    nama_jabatan character varying(50) NOT NULL,
    level_akses character varying(20),
    CONSTRAINT jabatan_level_akses_check CHECK (((level_akses)::text = ANY (ARRAY[('kepsek'::character varying)::text, ('admin'::character varying)::text, ('pegawai'::character varying)::text, ('waka'::character varying)::text, ('user'::character varying)::text])))
);


ALTER TABLE public.jabatan OWNER TO postgres;

--
-- Name: jabatan_id_jabatan_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.jabatan_id_jabatan_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jabatan_id_jabatan_seq OWNER TO postgres;

--
-- Name: jabatan_id_jabatan_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.jabatan_id_jabatan_seq OWNED BY public.jabatan.id_jabatan;


--
-- Name: log; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log (
    id_log integer CONSTRAINT log_aktivitas_id_log_not_null NOT NULL,
    id_user integer,
    aksi character varying(200),
    tabel_terkait character varying(100),
    kolom_terkait character varying(100),
    id_data integer,
    values_old text,
    values_new text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


ALTER TABLE public.log OWNER TO postgres;

--
-- Name: log_aktivitas_id_log_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.log_aktivitas_id_log_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.log_aktivitas_id_log_seq OWNER TO postgres;

--
-- Name: log_aktivitas_id_log_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.log_aktivitas_id_log_seq OWNED BY public.log.id_log;


--
-- Name: log_distribusi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.log_distribusi (
    id_riwayat integer CONSTRAINT riwayat_alur_surat_id_riwayat_not_null NOT NULL,
    id_sm integer,
    id_sk integer,
    status_asal character varying(50),
    status_tujuan character varying(50),
    id_user integer,
    catatan text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_xor_surat CHECK ((((id_sm IS NOT NULL) AND (id_sk IS NULL)) OR ((id_sk IS NULL) AND (id_sk IS NOT NULL))))
);


ALTER TABLE public.log_distribusi OWNER TO postgres;

--
-- Name: notifikasi; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notifikasi (
    id_notifikasi integer NOT NULL,
    id_penerima integer NOT NULL,
    id_pengirim integer,
    jenis character varying(30),
    judul character varying(300) NOT NULL,
    pesan text,
    is_read boolean DEFAULT false,
    waktu_baca timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    link_url character varying(500),
    tipe_referensi character varying(20),
    id_referensi integer,
    CONSTRAINT notifikasi_jenis_check CHECK (((jenis)::text = ANY ((ARRAY['surat_masuk_baru'::character varying, 'surat_keluar_baru'::character varying, 'surat_disetujui'::character varying, 'surat_ditolak'::character varying, 'surat_masuk_dikonfirmasi'::character varying, 'surat_keluar_dikonfirmasi'::character varying, 'permintaan_persetujuan_akun'::character varying, 'review_surat'::character varying, 'surat_diteruskan'::character varying, 'surat_diteruskan_waka'::character varying, 'disposisi_diterima'::character varying])::text[])))
);


ALTER TABLE public.notifikasi OWNER TO postgres;

--
-- Name: notifikasi_id_notifikasi_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notifikasi_id_notifikasi_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifikasi_id_notifikasi_seq OWNER TO postgres;

--
-- Name: notifikasi_id_notifikasi_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notifikasi_id_notifikasi_seq OWNED BY public.notifikasi.id_notifikasi;


--
-- Name: otp; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.otp (
    id_otp integer NOT NULL,
    id_user integer NOT NULL,
    kode_otp character varying(10) NOT NULL,
    expires_at timestamp without time zone NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_used boolean DEFAULT false
);


ALTER TABLE public.otp OWNER TO postgres;

--
-- Name: otp_id_otp_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.otp_id_otp_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.otp_id_otp_seq OWNER TO postgres;

--
-- Name: otp_id_otp_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.otp_id_otp_seq OWNED BY public.otp.id_otp;


--
-- Name: riwayat_alur_surat_id_riwayat_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.riwayat_alur_surat_id_riwayat_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.riwayat_alur_surat_id_riwayat_seq OWNER TO postgres;

--
-- Name: riwayat_alur_surat_id_riwayat_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.riwayat_alur_surat_id_riwayat_seq OWNED BY public.log_distribusi.id_riwayat;


--
-- Name: surat_keluar; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.surat_keluar (
    id_surat_keluar integer NOT NULL,
    kode_surat integer NOT NULL,
    no_surat character varying(100) NOT NULL,
    perihal character varying(200) NOT NULL,
    catatan character varying(300),
    tanggal_surat date NOT NULL,
    file_pdf character varying(500),
    status_verifikasi character varying(50) DEFAULT 'menunggu'::character varying,
    user_verifikasi integer,
    tanggal_verifikasi timestamp without time zone,
    tujuan character varying(200),
    catatan_verifikasi text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status_alur character varying(50) DEFAULT 'diterima_tu'::character varying,
    CONSTRAINT surat_keluar_status_check CHECK (((status_verifikasi)::text = ANY (ARRAY[('menunggu'::character varying)::text, ('disetujui'::character varying)::text, ('ditolak'::character varying)::text])))
);


ALTER TABLE public.surat_keluar OWNER TO postgres;

--
-- Name: surat_keluar_id_surat_keluar_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.surat_keluar_id_surat_keluar_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.surat_keluar_id_surat_keluar_seq OWNER TO postgres;

--
-- Name: surat_keluar_id_surat_keluar_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.surat_keluar_id_surat_keluar_seq OWNED BY public.surat_keluar.id_surat_keluar;


--
-- Name: surat_masuk; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.surat_masuk (
    id_surat_masuk integer NOT NULL,
    no_surat character varying(100) NOT NULL,
    perihal_surat character varying(200) NOT NULL,
    asal_surat character varying(200) NOT NULL,
    tanggal_surat date NOT NULL,
    file_pdf character varying(500),
    tanggal_diterima date DEFAULT CURRENT_DATE,
    status_verifikasi character varying(50) DEFAULT 'menunggu'::character varying,
    user_verifikasi integer,
    tanggal_verifikasi timestamp without time zone,
    catatan_verifikasi text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    id_disposisi_aktif integer,
    status_alur character varying(50) DEFAULT 'diterima_tu'::character varying,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_status_alur_sm CHECK (((status_alur)::text = ANY ((ARRAY['diterima_tu'::character varying, 'disposisi_kepsek'::character varying, 'didistribusikan_waka'::character varying, 'diteruskan_waka'::character varying, 'diteruskan'::character varying, 'selesai'::character varying])::text[]))),
    CONSTRAINT surat_masuk_status_check CHECK (((status_verifikasi)::text = ANY (ARRAY[('menunggu'::character varying)::text, ('disetujui'::character varying)::text, ('ditolak'::character varying)::text])))
);


ALTER TABLE public.surat_masuk OWNER TO postgres;

--
-- Name: surat_masuk_id_surat_masuk_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.surat_masuk_id_surat_masuk_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.surat_masuk_id_surat_masuk_seq OWNER TO postgres;

--
-- Name: surat_masuk_id_surat_masuk_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.surat_masuk_id_surat_masuk_seq OWNED BY public.surat_masuk.id_surat_masuk;


--
-- Name: user_jabatan; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.user_jabatan (
    id_user integer NOT NULL,
    id_jabatan integer NOT NULL,
    is_primary boolean DEFAULT false
);


ALTER TABLE public.user_jabatan OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id_user integer NOT NULL,
    nama character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password character varying(255) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    foto_profil text DEFAULT ''::text
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: users_id_user_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_user_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_user_seq OWNER TO postgres;

--
-- Name: users_id_user_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_user_seq OWNED BY public.users.id_user;


--
-- Name: disposisi id_disposisi; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disposisi ALTER COLUMN id_disposisi SET DEFAULT nextval('public.disposisi_id_disposisi_seq'::regclass);


--
-- Name: distribusi_sk id_distribusi; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sk ALTER COLUMN id_distribusi SET DEFAULT nextval('public.distribusi_surat_keluar_id_distribusi_seq'::regclass);


--
-- Name: distribusi_sm id_penerima_disposisi; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sm ALTER COLUMN id_penerima_disposisi SET DEFAULT nextval('public.disposisi_penerima_id_penerima_disposisi_seq'::regclass);


--
-- Name: jabatan id_jabatan; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jabatan ALTER COLUMN id_jabatan SET DEFAULT nextval('public.jabatan_id_jabatan_seq'::regclass);


--
-- Name: log id_log; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log ALTER COLUMN id_log SET DEFAULT nextval('public.log_aktivitas_id_log_seq'::regclass);


--
-- Name: log_distribusi id_riwayat; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_distribusi ALTER COLUMN id_riwayat SET DEFAULT nextval('public.riwayat_alur_surat_id_riwayat_seq'::regclass);


--
-- Name: notifikasi id_notifikasi; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifikasi ALTER COLUMN id_notifikasi SET DEFAULT nextval('public.notifikasi_id_notifikasi_seq'::regclass);


--
-- Name: otp id_otp; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp ALTER COLUMN id_otp SET DEFAULT nextval('public.otp_id_otp_seq'::regclass);


--
-- Name: surat_keluar id_surat_keluar; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.surat_keluar ALTER COLUMN id_surat_keluar SET DEFAULT nextval('public.surat_keluar_id_surat_keluar_seq'::regclass);


--
-- Name: surat_masuk id_surat_masuk; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.surat_masuk ALTER COLUMN id_surat_masuk SET DEFAULT nextval('public.surat_masuk_id_surat_masuk_seq'::regclass);


--
-- Name: users id_user; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id_user SET DEFAULT nextval('public.users_id_user_seq'::regclass);


--
-- Data for Name: disposisi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.disposisi (id_disposisi, tanggapan_saran, proses_lanjut, koordinasi_konfirmasi, id_surat_masuk, id_kepsek, id_penerima, tanggal_disposisi, status_disposisi, status_approval, approval_at, catatan_kepsek, id_jabatan_penerima, isi_disposisi, batas_waktu, catatan_waka, id_waka) FROM stdin;
1	\N			1	2	7	2026-06-10 21:05:55.777114	belum_dibaca	menunggu	\N	\N	8				\N
2	\N			2	2	7	2026-06-10 21:34:21.218136	dibaca	menunggu	\N	\N	\N				\N
3	\N			2	7	4	2026-06-10 22:00:17.577273	dibaca	menunggu	\N	\N	\N			sip	7
4	\N			3	2	7	2026-06-10 22:15:22.34015	dibaca	menunggu	\N	\N	\N				\N
5	\N			3	7	6	2026-06-10 22:15:54.245928	dibaca	menunggu	\N	\N	\N			siap	7
6	\N			4	2	7	2026-06-10 23:06:29.519738	belum_dibaca	menunggu	\N	\N	\N				\N
\.


--
-- Data for Name: distribusi_sk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.distribusi_sk (id_distribusi, id_sk, id_user, status, distribute_at, read_at, catatan, id_jabatan) FROM stdin;
\.


--
-- Data for Name: distribusi_sm; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.distribusi_sm (id_penerima_disposisi, id_disposisi, id_user, id_jabatan, read_at, created_at, status, id_waka, id_distribusi_parent) FROM stdin;
\.


--
-- Data for Name: jabatan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.jabatan (id_jabatan, nama_jabatan, level_akses) FROM stdin;
1	kepala sekolah	kepsek
2	admin	admin
3	pegawai	pegawai
9	bkk	user
11	kapro rpl	user
12	kapro tkj	user
13	kapro dkv	user
15	kapro ei	user
16	kapro mt	user
17	kapro av	user
18	kapro bc	user
14	kapro an	user
19	bk	user
20	prakerin	user
22	koordinator bk	user
23	koordinator bkk	user
5	waka kesiswaan	waka
6	waka kurikulum	waka
7	waka sarpras	waka
8	waka humas	waka
21	koordinator waka	waka
24	guru	user
25	user	user
\.


--
-- Data for Name: log; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.log (id_log, id_user, aksi, tabel_terkait, kolom_terkait, id_data, values_old, values_new, updated_at) FROM stdin;
1	2	LOGIN	users		\N			2026-06-10 19:57:10.154941
2	2	EDIT_AKUN	users		\N			2026-06-10 19:59:12.304044
3	7	LOGIN	users		\N			2026-06-10 21:00:01.519951
4	2	LOGIN	users		\N			2026-06-10 21:00:19.249344
5	2	BUAT_SURAT_MASUK	surat_masuk		\N			2026-06-10 21:01:04.968704
6	1	LOGIN	users		\N			2026-06-10 21:01:21.484149
7	1	UPDATE status_verifikasi	surat_masuk	status_verifikasi	1	menunggu	disetujui	2026-06-10 21:01:51.528628
8	1	REVIEW_SURAT_MASUK	surat_masuk		\N			2026-06-10 21:01:51.543874
9	2	LOGIN	users		\N			2026-06-10 21:04:07.947225
10	2	EDIT_AKUN	users		\N			2026-06-10 21:04:37.010274
11	2	EDIT_AKUN	users		\N			2026-06-10 21:04:42.144462
12	2	TERUSKAN_SURAT_KE_WAKA	surat_masuk		\N			2026-06-10 21:05:55.787807
13	7	LOGIN	users		\N			2026-06-10 21:06:23.308449
14	2	LOGIN	users		\N			2026-06-10 21:31:44.568647
15	2	BUAT_SURAT_MASUK	surat_masuk		\N			2026-06-10 21:32:17.466824
16	1	LOGIN	users		\N			2026-06-10 21:33:04.726677
17	1	UPDATE status_verifikasi	surat_masuk	status_verifikasi	2	menunggu	disetujui	2026-06-10 21:33:46.855765
18	1	REVIEW_SURAT_MASUK	surat_masuk		\N			2026-06-10 21:33:46.870524
19	2	LOGIN	users		\N			2026-06-10 21:34:12.273794
20	2	TERUSKAN_SURAT_KE_WAKA	surat_masuk		\N			2026-06-10 21:34:21.230241
21	7	LOGIN	users		\N			2026-06-10 21:35:02.345507
22	2	LOGIN	users		\N			2026-06-10 21:45:13.969978
23	2	LOGIN	users		\N			2026-06-10 21:53:09.79815
24	2	BUAT_AKUN	users		\N			2026-06-10 21:55:37.544649
25	8	LOGIN	users		\N			2026-06-10 21:56:03.873762
26	2	LOGIN	users		\N			2026-06-10 21:56:39.823751
27	7	LOGIN	users		\N			2026-06-10 21:57:56.666468
28	2	LOGIN	users		\N			2026-06-10 21:58:13.972002
29	2	EDIT_AKUN	users		\N			2026-06-10 21:58:40.415113
30	2	EDIT_AKUN	users		\N			2026-06-10 21:58:48.571624
31	2	LOGIN	users		\N			2026-06-10 21:58:56.865305
32	7	LOGIN	users		\N			2026-06-10 21:59:22.537707
33	7	TERUSKAN_SURAT_WAKA_KE_USER	surat_masuk		\N			2026-06-10 22:00:17.586661
34	4	LOGIN	users		\N			2026-06-10 22:00:37.347784
35	4	BUKA_SURAT	disposisi		\N			2026-06-10 22:00:39.48634
36	6	LOGIN	users		\N			2026-06-10 22:01:00.980546
37	3	LOGIN	users		\N			2026-06-10 22:01:13.684999
38	2	LOGIN	users		\N			2026-06-10 22:14:05.695862
39	2	BUAT_SURAT_MASUK	surat_masuk		\N			2026-06-10 22:14:45.866501
40	1	LOGIN	users		\N			2026-06-10 22:14:54.221704
41	1	UPDATE status_verifikasi	surat_masuk	status_verifikasi	3	menunggu	disetujui	2026-06-10 22:15:05.803017
42	1	REVIEW_SURAT_MASUK	surat_masuk		\N			2026-06-10 22:15:05.820101
43	2	LOGIN	users		\N			2026-06-10 22:15:12.352871
44	2	TERUSKAN_SURAT_KE_WAKA	surat_masuk		\N			2026-06-10 22:15:22.352082
45	7	LOGIN	users		\N			2026-06-10 22:15:42.35598
46	7	TERUSKAN_SURAT_WAKA_KE_USER	surat_masuk		\N			2026-06-10 22:15:54.259554
47	2	LOGIN	users		\N			2026-06-10 22:16:06.267692
48	6	LOGIN	users		\N			2026-06-10 22:16:15.835426
49	6	BUKA_SURAT	disposisi		\N			2026-06-10 22:16:17.908475
50	2	LOGIN	users		\N			2026-06-10 22:16:26.345057
51	2	LOGIN	users		\N			2026-06-10 22:38:25.065774
52	2	UPDATE_FOTO_PROFIL	users		\N			2026-06-10 22:39:15.810249
53	2	BUAT_AKUN	users		\N			2026-06-10 22:41:40.383796
54	2	LOGIN	users		\N			2026-06-10 22:44:08.402997
55	2	EDIT_AKUN	users		\N			2026-06-10 22:47:40.742486
56	2	EDIT_AKUN	users		\N			2026-06-10 22:47:54.978469
57	2	EDIT_AKUN	users		\N			2026-06-10 22:48:00.118527
58	2	EDIT_AKUN	users		\N			2026-06-10 22:48:03.576433
59	2	EDIT_AKUN	users		\N			2026-06-10 22:48:10.139269
60	2	EDIT_AKUN	users		\N			2026-06-10 22:48:22.632719
61	2	EDIT_AKUN	users		\N			2026-06-10 22:48:29.062962
62	2	EDIT_AKUN	users		\N			2026-06-10 22:48:32.256162
63	2	BUAT_SURAT_KELUAR	surat_keluar		\N			2026-06-10 22:55:31.714849
64	2	BUAT_SURAT_MASUK	surat_masuk		\N			2026-06-10 23:05:43.492918
65	1	LOGIN	users		\N			2026-06-10 23:05:52.799535
66	1	UPDATE status_verifikasi	surat_masuk	status_verifikasi	4	menunggu	disetujui	2026-06-10 23:06:08.217714
67	1	REVIEW_SURAT_MASUK	surat_masuk		\N			2026-06-10 23:06:08.235268
68	2	LOGIN	users		\N			2026-06-10 23:06:22.99345
69	2	TERUSKAN_SURAT_KE_WAKA	surat_masuk		\N			2026-06-10 23:06:29.538427
70	1	LOGIN	users		\N			2026-06-10 23:09:38.591547
71	7	LOGIN	users		\N			2026-06-10 23:10:57.744104
72	2	LOGIN	users		\N			2026-06-10 23:14:01.112608
73	1	LOGIN	users		\N			2026-06-10 23:14:21.098547
74	6	LOGIN	users		\N			2026-06-10 23:14:45.09772
75	7	LOGIN	users		\N			2026-06-10 23:16:02.466607
76	2	LOGIN	users		\N			2026-06-10 23:17:42.029385
77	2	LOGIN	users		\N			2026-06-10 23:30:41.634083
\.


--
-- Data for Name: log_distribusi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.log_distribusi (id_riwayat, id_sm, id_sk, status_asal, status_tujuan, id_user, catatan, created_at) FROM stdin;
\.


--
-- Data for Name: notifikasi; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.notifikasi (id_notifikasi, id_penerima, id_pengirim, jenis, judul, pesan, is_read, waktu_baca, created_at, link_url, tipe_referensi, id_referensi) FROM stdin;
22	7	2	surat_diteruskan	Surat Baru Untuk Anda	Disposisi: Expo	t	2026-06-10 22:15:54.566572	2026-06-10 22:15:22.34766		surat_masuk	3
19	2	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	t	2026-06-10 23:06:37.1618	2026-06-10 22:15:05.814515		surat_masuk	3
3	5	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	f	\N	2026-06-10 21:01:51.541441		surat_masuk	1
4	3	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	f	\N	2026-06-10 21:01:51.542916		surat_masuk	1
28	5	6	disposisi_diterima	Surat Telah Dibuka	dummy_bkk telah membuka dan membaca surat: Expo	f	\N	2026-06-10 22:16:17.905196		surat_masuk	\N
29	3	6	disposisi_diterima	Surat Telah Dibuka	dummy_bkk telah membuka dan membaca surat: Expo	f	\N	2026-06-10 22:16:17.907083		surat_masuk	\N
23	6	7	surat_diteruskan	Surat Baru Untuk Anda	Disposisi dari Waka: Expo	t	2026-06-10 22:16:17.915416	2026-06-10 22:15:54.249868		surat_masuk	3
14	3	7	surat_diteruskan	Surat Diteruskan oleh Waka	dummy_wakahumas meneruskan surat ke 1 user	t	2026-06-10 22:13:57.125449	2026-06-10 22:00:17.601945		surat_masuk	2
9	3	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	t	2026-06-10 22:13:57.125449	2026-06-10 21:33:46.869367		surat_masuk	2
1	1	2	surat_masuk_baru	Surat Masuk Baru	Surat masuk baru: LKS	t	2026-06-10 21:04:02.165954	2026-06-10 21:01:04.964566		surat_masuk	1
20	5	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	f	\N	2026-06-10 22:15:05.816681		surat_masuk	3
21	3	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	f	\N	2026-06-10 22:15:05.81806		surat_masuk	3
18	1	2	surat_masuk_baru	Surat Masuk Baru	Surat masuk baru: Expo	t	2026-06-10 22:15:06.200671	2026-06-10 22:14:45.862855		surat_masuk	3
30	1	2	surat_keluar_baru	Surat Keluar Baru	Surat keluar baru: MGB	f	\N	2026-06-10 22:55:31.711055		surat_keluar	1
13	5	7	surat_diteruskan	Surat Diteruskan oleh Waka	dummy_wakahumas meneruskan surat ke 1 user	f	\N	2026-06-10 22:00:17.600343		surat_masuk	2
10	7	2	surat_diteruskan	Surat Baru Untuk Anda	Disposisi: Undangan	t	2026-06-10 22:00:17.614727	2026-06-10 21:34:21.225473		surat_masuk	2
5	7	2	surat_diteruskan	Surat Baru Untuk Anda	Disposisi: LKS	t	2026-06-10 21:31:34.187985	2026-06-10 21:05:55.782722		surat_masuk	1
16	5	4	disposisi_diterima	Surat Telah Dibuka	dummy_rpl telah membuka dan membaca surat: Undangan	f	\N	2026-06-10 22:00:39.482994		surat_masuk	\N
17	3	4	disposisi_diterima	Surat Telah Dibuka	dummy_rpl telah membuka dan membaca surat: Undangan	f	\N	2026-06-10 22:00:39.484981		surat_masuk	\N
11	4	7	surat_diteruskan	Surat Baru Untuk Anda	Disposisi dari Waka: Undangan	t	2026-06-10 22:00:39.493828	2026-06-10 22:00:17.580907		surat_masuk	2
8	5	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	f	\N	2026-06-10 21:33:46.868363		surat_masuk	2
6	1	2	surat_masuk_baru	Surat Masuk Baru	Surat masuk baru: Undangan	t	2026-06-10 21:33:47.75329	2026-06-10 21:32:17.46391		surat_masuk	2
25	5	7	surat_diteruskan	Surat Diteruskan oleh Waka	dummy_wakahumas meneruskan surat ke 1 user	f	\N	2026-06-10 22:15:54.268667		surat_masuk	3
26	3	7	surat_diteruskan	Surat Diteruskan oleh Waka	dummy_wakahumas meneruskan surat ke 1 user	f	\N	2026-06-10 22:15:54.270054		surat_masuk	3
7	2	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	t	2026-06-10 21:58:59.49683	2026-06-10 21:33:46.866422		surat_masuk	2
2	2	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	t	2026-06-10 22:54:58.404748	2026-06-10 21:01:51.537958		surat_masuk	1
12	2	7	surat_diteruskan	Surat Diteruskan oleh Waka	dummy_wakahumas meneruskan surat ke 1 user	t	2026-06-10 23:04:58.353593	2026-06-10 22:00:17.597806		surat_masuk	2
15	2	4	disposisi_diterima	Surat Telah Dibuka	dummy_rpl telah membuka dan membaca surat: Undangan	t	2026-06-10 23:04:58.353593	2026-06-10 22:00:39.480902		surat_masuk	\N
27	2	6	disposisi_diterima	Surat Telah Dibuka	dummy_bkk telah membuka dan membaca surat: Expo	t	2026-06-10 23:04:56.588684	2026-06-10 22:16:17.902931		surat_masuk	\N
33	5	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	f	\N	2026-06-10 23:06:08.23236		surat_masuk	4
34	3	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	f	\N	2026-06-10 23:06:08.233925		surat_masuk	4
31	1	2	surat_masuk_baru	Surat Masuk Baru	Surat masuk baru: MBG	t	2026-06-10 23:06:15.240713	2026-06-10 23:05:43.489383		surat_masuk	4
24	2	7	surat_diteruskan	Surat Diteruskan oleh Waka	dummy_wakahumas meneruskan surat ke 1 user	t	2026-06-10 23:06:37.1618	2026-06-10 22:15:54.266668		surat_masuk	3
32	2	1	review_surat	Surat Masuk disetujui	Surat ___/VI/2026 telah disetujui oleh Kepsek	t	2026-06-10 23:06:42.347748	2026-06-10 23:06:08.22969		surat_masuk	4
35	7	2	surat_diteruskan	Surat Baru Untuk Anda	Disposisi: MBG	t	2026-06-10 23:17:23.323931	2026-06-10 23:06:29.532901		surat_masuk	4
\.


--
-- Data for Name: otp; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.otp (id_otp, id_user, kode_otp, expires_at, created_at, is_used) FROM stdin;
1	9	222984	2026-06-10 22:46:55.359137	2026-06-10 22:41:55.364721	f
\.


--
-- Data for Name: surat_keluar; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.surat_keluar (id_surat_keluar, kode_surat, no_surat, perihal, catatan, tanggal_surat, file_pdf, status_verifikasi, user_verifikasi, tanggal_verifikasi, tujuan, catatan_verifikasi, created_at, updated_at, status_alur) FROM stdin;
1	421	421/___/VI/2026	MGB		2026-06-10	sk_1781106931692557400.pdf	menunggu	\N	\N	Dinas	\N	2026-06-10 22:55:31.702905+07	2026-06-10 22:55:31.702905+07	diterima_tu
\.


--
-- Data for Name: surat_masuk; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.surat_masuk (id_surat_masuk, no_surat, perihal_surat, asal_surat, tanggal_surat, file_pdf, tanggal_diterima, status_verifikasi, user_verifikasi, tanggal_verifikasi, catatan_verifikasi, created_at, id_disposisi_aktif, status_alur, updated_at) FROM stdin;
1	___/VI/2026	LKS	Dinas Pendidikan	2026-06-10	sm_1781100064950107300.pdf	2026-06-10	disetujui	1	2026-06-10 21:01:51.528628		2026-06-10 21:01:04.95688+07	1	diteruskan_waka	2026-06-10 22:27:33.864733+07
3	___/VI/2026	Expo	Pemkot	2026-06-10	sm_1781104485849976400.pdf	2026-06-10	disetujui	1	2026-06-10 22:15:05.803017	lanjutkan\n\n[Diteruskan kepada: waka kesiswaan]	2026-06-10 22:14:45.858992+07	5	diteruskan	2026-06-10 22:27:33.871147+07
2	___/VI/2026	Undangan	Kominfo	2026-06-10	sm_1781101937446466500.pdf	2026-06-10	disetujui	1	2026-06-10 21:33:46.855765	surat saya terima\n\n[Diteruskan kepada: waka humas]	2026-06-10 21:32:17.451947+07	3	diteruskan	2026-06-10 22:27:33.87358+07
4	___/VI/2026	MBG	Kementrian Pangan	2026-06-10	sm_1781107543481727800.pdf	2026-06-10	disetujui	1	2026-06-10 23:06:08.217714	lanjutkan\n[Diteruskan kepada: waka kesiswaan]	2026-06-10 23:05:43.485434+07	6	diteruskan_waka	2026-06-10 23:06:29.536695+07
\.


--
-- Data for Name: user_jabatan; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.user_jabatan (id_user, id_jabatan, is_primary) FROM stdin;
1	1	t
2	2	t
5	2	t
7	8	t
3	3	t
8	24	t
4	24	t
6	24	t
9	24	t
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public.users (id_user, nama, email, password, created_at, foto_profil) FROM stdin;
1	dummy_kepsek	dummy_kepsek@gmail.com	$2a$10$Y1nHfmJ5KcZHwfLQ0F9mfufIt1sFgzU8bAIhcpVhBFFHz.A4ah1fW	2026-05-25 19:44:51.727343	
5	dummy_admin2	dummy_admin2@gmail.com	$2a$10$wtHz.gp3hv3H4tlAeoGGSuPnrvjg8A0003K7ld4Bj3qxegkmm/MBi	2026-05-25 19:47:04.095179	
7	dummy_wakahumas	dummy_wakahumas@gmail.com	$2a$10$RND7yGZJs9196Y5f9XNZQubr529964k.TAbhkDbhms8.Pw8DZ4Owi	2026-06-04 20:16:12.231802	
3	dummy_pegawai	dummy_pegawai@gmail.com	$2a$10$QOwBKLJsN70xdjNiD.H4a.O7X2t980n4J0TBGRsMh4a.1qmIbxD8K	2026-05-25 19:46:19.919197	
2	dummy_admin	dummy_admin@gmail.com	$2a$10$/BOyBagNMN1xZSzj1uFIwOC3uVA20I6OYexHgrjkVzqBeeHW91WJ6	2026-05-25 19:46:19.919197	avatar_1781105955799632900.jpg
8	aang	aang@gmail.com	$2a$10$mwn4.7N6n904qv.L6txNVOSbHGVTwAlZDSfgdawZnB6m2UOF0wh06	2026-06-10 21:55:37.538715	
4	dummy_rpl	dummy_rpl@gmail.com	$2a$10$QQYf4iWX3qWftcwBX55TouRZRaAHTMHTtFh.2U5.WKFghX7wiytXu	2026-05-25 19:46:19.919197	
6	dummy_bkk	dummy_bkk@gmail.com	$2a$10$htyGMdzbbsYVz7RSHfwo/./C4Hj1vitMWZFPCv35k6s.OMeiPDCgq	2026-05-25 19:51:32.59051	
9	bisma	purbawasesabisma@gmail.com	$2a$10$oJz7O.mbw3c109uTjyOj3ecpbPe65gGyrmJZPl/imDmCc/1c8kZBi	2026-06-10 22:41:40.370186	
\.


--
-- Name: disposisi_id_disposisi_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disposisi_id_disposisi_seq', 6, true);


--
-- Name: disposisi_penerima_id_penerima_disposisi_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.disposisi_penerima_id_penerima_disposisi_seq', 1, false);


--
-- Name: distribusi_surat_keluar_id_distribusi_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.distribusi_surat_keluar_id_distribusi_seq', 1, false);


--
-- Name: jabatan_id_jabatan_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.jabatan_id_jabatan_seq', 28, true);


--
-- Name: log_aktivitas_id_log_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.log_aktivitas_id_log_seq', 77, true);


--
-- Name: notifikasi_id_notifikasi_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.notifikasi_id_notifikasi_seq', 35, true);


--
-- Name: otp_id_otp_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.otp_id_otp_seq', 1, true);


--
-- Name: riwayat_alur_surat_id_riwayat_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.riwayat_alur_surat_id_riwayat_seq', 1, false);


--
-- Name: surat_keluar_id_surat_keluar_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.surat_keluar_id_surat_keluar_seq', 1, true);


--
-- Name: surat_masuk_id_surat_masuk_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.surat_masuk_id_surat_masuk_seq', 4, true);


--
-- Name: users_id_user_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('public.users_id_user_seq', 9, true);


--
-- Name: distribusi_sm disposisi_penerima_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sm
    ADD CONSTRAINT disposisi_penerima_pkey PRIMARY KEY (id_penerima_disposisi);


--
-- Name: disposisi disposisi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disposisi
    ADD CONSTRAINT disposisi_pkey PRIMARY KEY (id_disposisi);


--
-- Name: distribusi_sk distribusi_surat_keluar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sk
    ADD CONSTRAINT distribusi_surat_keluar_pkey PRIMARY KEY (id_distribusi);


--
-- Name: jabatan jabatan_nama_jabatan_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jabatan
    ADD CONSTRAINT jabatan_nama_jabatan_key UNIQUE (nama_jabatan);


--
-- Name: jabatan jabatan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.jabatan
    ADD CONSTRAINT jabatan_pkey PRIMARY KEY (id_jabatan);


--
-- Name: log log_aktivitas_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT log_aktivitas_pkey PRIMARY KEY (id_log);


--
-- Name: notifikasi notifikasi_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifikasi
    ADD CONSTRAINT notifikasi_pkey PRIMARY KEY (id_notifikasi);


--
-- Name: otp otp_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp
    ADD CONSTRAINT otp_pkey PRIMARY KEY (id_otp);


--
-- Name: log_distribusi riwayat_alur_surat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_distribusi
    ADD CONSTRAINT riwayat_alur_surat_pkey PRIMARY KEY (id_riwayat);


--
-- Name: surat_keluar surat_keluar_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.surat_keluar
    ADD CONSTRAINT surat_keluar_pkey PRIMARY KEY (id_surat_keluar);


--
-- Name: surat_masuk surat_masuk_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.surat_masuk
    ADD CONSTRAINT surat_masuk_pkey PRIMARY KEY (id_surat_masuk);


--
-- Name: distribusi_sm uq_disposisi_penerima; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sm
    ADD CONSTRAINT uq_disposisi_penerima UNIQUE (id_disposisi, id_user, id_jabatan);


--
-- Name: user_jabatan user_jabatan_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_jabatan
    ADD CONSTRAINT user_jabatan_pkey PRIMARY KEY (id_user, id_jabatan);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id_user);


--
-- Name: disposisi trg_disposisi_baru; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_disposisi_baru AFTER INSERT ON public.disposisi FOR EACH ROW EXECUTE FUNCTION public.update_disposisi_aktif();


--
-- Name: distribusi_sk trg_distribusi_dibaca; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_distribusi_dibaca BEFORE UPDATE ON public.distribusi_sk FOR EACH ROW EXECUTE FUNCTION public.set_tanggal_dibaca();


--
-- Name: distribusi_sk trg_distribusi_sk_dibaca; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_distribusi_sk_dibaca BEFORE UPDATE ON public.distribusi_sk FOR EACH ROW EXECUTE FUNCTION public.set_tanggal_dibaca();


--
-- Name: surat_masuk trg_log_surat_masuk; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_log_surat_masuk AFTER UPDATE ON public.surat_masuk FOR EACH ROW EXECUTE FUNCTION public.log_surat_masuk_changes();


--
-- Name: notifikasi trg_notifikasi_baca; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_notifikasi_baca BEFORE UPDATE ON public.notifikasi FOR EACH ROW EXECUTE FUNCTION public.set_waktu_baca_notif();


--
-- Name: surat_keluar trg_surat_keluar_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_surat_keluar_updated BEFORE UPDATE ON public.surat_keluar FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: surat_masuk trg_surat_masuk_updated; Type: TRIGGER; Schema: public; Owner: postgres
--

CREATE TRIGGER trg_surat_masuk_updated BEFORE UPDATE ON public.surat_masuk FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: disposisi disposisi_id_jabatan_penerima_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disposisi
    ADD CONSTRAINT disposisi_id_jabatan_penerima_fkey FOREIGN KEY (id_jabatan_penerima) REFERENCES public.jabatan(id_jabatan);


--
-- Name: disposisi disposisi_id_waka_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disposisi
    ADD CONSTRAINT disposisi_id_waka_fkey FOREIGN KEY (id_waka) REFERENCES public.users(id_user);


--
-- Name: distribusi_sm disposisi_penerima_disposisi_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sm
    ADD CONSTRAINT disposisi_penerima_disposisi_fkey FOREIGN KEY (id_disposisi) REFERENCES public.disposisi(id_disposisi) ON DELETE CASCADE;


--
-- Name: distribusi_sm disposisi_penerima_jabatan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sm
    ADD CONSTRAINT disposisi_penerima_jabatan_fkey FOREIGN KEY (id_jabatan) REFERENCES public.jabatan(id_jabatan) ON DELETE CASCADE;


--
-- Name: distribusi_sm disposisi_penerima_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sm
    ADD CONSTRAINT disposisi_penerima_user_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user) ON DELETE CASCADE;


--
-- Name: distribusi_sk distribusi_sk_id_jabatan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sk
    ADD CONSTRAINT distribusi_sk_id_jabatan_fkey FOREIGN KEY (id_jabatan) REFERENCES public.jabatan(id_jabatan);


--
-- Name: distribusi_sm distribusi_sm_id_waka_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sm
    ADD CONSTRAINT distribusi_sm_id_waka_fkey FOREIGN KEY (id_waka) REFERENCES public.users(id_user);


--
-- Name: distribusi_sk distribusi_surat_keluar_id_penerima_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sk
    ADD CONSTRAINT distribusi_surat_keluar_id_penerima_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user);


--
-- Name: distribusi_sk distribusi_surat_keluar_id_surat_keluar_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sk
    ADD CONSTRAINT distribusi_surat_keluar_id_surat_keluar_fkey FOREIGN KEY (id_sk) REFERENCES public.surat_keluar(id_surat_keluar) ON DELETE CASCADE;


--
-- Name: disposisi fk_disposisi_kepsek; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disposisi
    ADD CONSTRAINT fk_disposisi_kepsek FOREIGN KEY (id_kepsek) REFERENCES public.users(id_user);


--
-- Name: disposisi fk_disposisi_penerima; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disposisi
    ADD CONSTRAINT fk_disposisi_penerima FOREIGN KEY (id_penerima) REFERENCES public.users(id_user);


--
-- Name: disposisi fk_disposisi_surat_masuk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.disposisi
    ADD CONSTRAINT fk_disposisi_surat_masuk FOREIGN KEY (id_surat_masuk) REFERENCES public.surat_masuk(id_surat_masuk);


--
-- Name: distribusi_sm fk_distribusi_parent; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.distribusi_sm
    ADD CONSTRAINT fk_distribusi_parent FOREIGN KEY (id_distribusi_parent) REFERENCES public.distribusi_sm(id_penerima_disposisi) ON DELETE SET NULL;


--
-- Name: log_distribusi fk_riwayat_sk; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_distribusi
    ADD CONSTRAINT fk_riwayat_sk FOREIGN KEY (id_sk) REFERENCES public.surat_keluar(id_surat_keluar) ON DELETE CASCADE;


--
-- Name: log_distribusi fk_riwayat_sm; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_distribusi
    ADD CONSTRAINT fk_riwayat_sm FOREIGN KEY (id_sm) REFERENCES public.surat_masuk(id_surat_masuk) ON DELETE CASCADE;


--
-- Name: surat_masuk fk_surat_masuk_disposisi_aktif; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.surat_masuk
    ADD CONSTRAINT fk_surat_masuk_disposisi_aktif FOREIGN KEY (id_disposisi_aktif) REFERENCES public.disposisi(id_disposisi) ON DELETE SET NULL;


--
-- Name: surat_masuk fk_surat_masuk_verifikasi; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.surat_masuk
    ADD CONSTRAINT fk_surat_masuk_verifikasi FOREIGN KEY (user_verifikasi) REFERENCES public.users(id_user);


--
-- Name: log log_aktivitas_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log
    ADD CONSTRAINT log_aktivitas_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user);


--
-- Name: notifikasi notifikasi_id_penerima_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifikasi
    ADD CONSTRAINT notifikasi_id_penerima_fkey FOREIGN KEY (id_penerima) REFERENCES public.users(id_user);


--
-- Name: notifikasi notifikasi_id_pengirim_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notifikasi
    ADD CONSTRAINT notifikasi_id_pengirim_fkey FOREIGN KEY (id_pengirim) REFERENCES public.users(id_user);


--
-- Name: otp otp_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.otp
    ADD CONSTRAINT otp_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user);


--
-- Name: log_distribusi riwayat_alur_surat_id_user_pelaku_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.log_distribusi
    ADD CONSTRAINT riwayat_alur_surat_id_user_pelaku_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user);


--
-- Name: surat_keluar surat_keluar_verifikasi_oleh_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.surat_keluar
    ADD CONSTRAINT surat_keluar_verifikasi_oleh_fkey FOREIGN KEY (user_verifikasi) REFERENCES public.users(id_user);


--
-- Name: user_jabatan user_jabatan_id_jabatan_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_jabatan
    ADD CONSTRAINT user_jabatan_id_jabatan_fkey FOREIGN KEY (id_jabatan) REFERENCES public.jabatan(id_jabatan);


--
-- Name: user_jabatan user_jabatan_id_user_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.user_jabatan
    ADD CONSTRAINT user_jabatan_id_user_fkey FOREIGN KEY (id_user) REFERENCES public.users(id_user);


--
-- PostgreSQL database dump complete
--

\unrestrict I5blfit6et7eOcN4jqjPqAcvwhmhjw2tPabZGgyMD7NBwYJ4yyAqtkIxsmIlLwm

