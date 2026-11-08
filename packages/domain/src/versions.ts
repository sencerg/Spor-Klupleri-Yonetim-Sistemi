export interface ProductVersion {
  version: string;
  date: string;
  features: string[];
  changes: string[];
}

export const productVersions: ProductVersion[] = [
  {
    version: "1.34.1",
    date: "2026-11-01",
    features: [
      "AllPlay360 özel üyesinde AllPlay360 logosu görünür.",
      "Kulüp sporcusu AllPlay360 üyeliğine bilinçli alınır. Özel üye kulüp kartı açmaz.",
      "Kulüp öğrenci endeksi yalnız kulüp kopyalarını sayar.",
    ],
    changes: [
      "İki kaynak iç içe yazılmaz; bakiyeler ayrı tutulur.",
    ],
  },
  {
    version: "1.34.0",
    date: "2026-11-01",
    features: [
      "Sistem panelinde sporcu listesi vardır. Kulüp sporcuları kopyalanır; kulüp kartı değişmez.",
      "AllPlay360 özel üyesi üyelik tipiyle açılır. İstenirse bir kulüple ilişkilendirilir.",
      "Kulüp başı aylık öğrenci fiyat endeksi × öğrenci adedi fatura tutarını verir.",
    ],
    changes: [
      "Sporcular menüsü /platform/sporcular altındadır.",
    ],
  },
  {
    version: "1.33.1",
    date: "2026-11-01",
    features: [
      "Sistem girişi kullanıcı adı admin, şifre 123456 ile açılır.",
    ],
    changes: [
      "localhost yalnız sistem yöneticisini kabul eder.",
    ],
  },
  {
    version: "1.33.0",
    date: "2026-11-01",
    features: [
      "localhost girişi AllPlay360 sistem yöneticisi ekranıdır.",
      "Kulüp girişi yalnız kulüp subdomaininde açılır. Demo hesap listesi yoktur.",
    ],
    changes: [
      "Sistem paneli AllPlay360 logosunu ve cyan vurguyu kullanır.",
    ],
  },
  {
    version: "1.32.4",
    date: "2026-11-01",
    features: [
      "Kulüp logosunda büyük dosya otomatik küçültülür. Kayıt 1 MB sınırına takılmaz.",
    ],
    changes: [
      "Server Action gövde limiti 3 MB olur.",
    ],
  },
  {
    version: "1.32.3",
    date: "2026-11-01",
    features: [
      "Kulüp subdomaininde yalnız o kulübün hesapları ve kayıtları açılır.",
    ],
    changes: [
      "Başka kulübün çerezi subdomaini ezmez.",
      "Sincan girişinde Yeni Ufuklar personeli veya Selin Acar görünmez.",
    ],
  },
  {
    version: "1.32.2",
    date: "2026-11-01",
    features: [
      "Kulüp açarken kullanıcı adı yazılır. Bu ad subdomain olur. Örnek: sincanbasket.",
    ],
    changes: [
      "Yeni Ufuklar girişi yeniufuklar.localhost üzerinden de açılır.",
      "Sincan girişi sincanbasket.localhost olur.",
    ],
  },
  {
    version: "1.32.1",
    date: "2026-11-01",
    features: [
      "Ayarlardaki ilk renk, açık kulübün adıdır. Renk logo veya açılış seçiminden gelir.",
    ],
    changes: [
      "Sabit Yeni Ufuklar renk satırı kalktı.",
    ],
  },
  {
    version: "1.32.0",
    date: "2026-10-31",
    features: [
      "Kulüp açarken il ve ilçe Türkiye listesinden seçilir.",
      "Logo yüklenir. Vurgu, açık ve zemin rengi logodan gelir.",
      "Kulüp açılınca kendi girişi hazırdır. Adres kulüp.localhost üzerinde açılır.",
    ],
    changes: [
      "Giriş ekranı kulübün adı, logosu, mottosu ve renkleriyle durur.",
      "Açılmış kulüpte logo ve renk sonradan da yazılır.",
    ],
  },
  {
    version: "1.31.0",
    date: "2026-10-31",
    features: [
      "Sistem yöneticisi kulüp açar.",
      "Açılan kulübün sporcu, tesis, personel, stok ve borç dökümü görülür.",
      "İstenirse o kulübün kendi ekranına girilir.",
    ],
    changes: [
      "Sahip, kulüp açılırken yazılan e-posta ile girer.",
      "Yeni Ufuklar sistem listesinde durur.",
    ],
  },
  {
    version: "1.30.0",
    date: "2026-10-30",
    features: [
      "Ürün açılırken beden yazılmaz. Antrenman forması ya da maç forması işaretlenirse standart bedenler açılır.",
      "Standart bedenler 1, 2, 3, 4, 5, XSmall, Small, Medium, Large ve XLarge olur.",
      "Antrenman formasına numara yazılır. Maç forması numarası, takım oyuncusunun kartında da durur.",
    ],
    changes: [
      "Karttaki maç numarası teslimden alınır ya da elle yazılır.",
      "Kart boşsa maç forması teslimindeki numara karta yazılır.",
      "İşaret yoksa ürün bedensiz açılır. Top buna girer.",
    ],
  },
  {
    version: "1.29.0",
    date: "2026-10-30",
    features: [
      "Stok satırı ürün, isteğe bağlı beden, tesis ve adettir. Tesis depodur.",
      "Forma her beden için ayrı açılır. Topun bedeni boş kalır.",
      "Teslim, seçilen satırın kalanından düşer.",
    ],
    changes: [
      "Aynı ürün, aynı beden ve aynı tesiste ikinci kez açılmaz.",
      "Adet, teslim edilmiş sayıdan az yazılmaz.",
      "Forma numarası teslimde yazılır. Beden stok satırından gelir.",
    ],
  },
  {
    version: "1.28.0",
    date: "2026-10-30",
    features: [
      "Sol menü, açılan sayfayı işaretler.",
    ],
    changes: [
      "Başka bir ekrana geçince önceki maddenin işareti kalkar.",
    ],
  },
  {
    version: "1.27.0",
    date: "2026-10-30",
    features: [
      "Stoktan ürün açılır. Örnek: antrenman forması.",
      "Teslimde beden, numara, sporcu, gün ve teslim eden yazılır. Fiyat ve ücretin alınıp alınmadığı da yazılır.",
      "Alınmayan ücret sporcu kartında, veli bilgisinde ve aidatın kalan hanesinde borç olarak durur.",
    ],
    changes: [
      "Ücreti alınan teslim borç açmaz. Kalanı aidat sayfasından tahsil edilir.",
      "Teslimi olan ürün silinmez. Teslim silinirse borç ve alınan ücret birlikte kalkar.",
    ],
  },
  {
    version: "1.26.0",
    date: "2026-10-30",
    features: [
      "Ana sayfa, rapor ve tesis kilidi kulübün kendi antrenman ve aidat kaydını okur.",
      "Yeni personel e-posta ve giriş rolü ile panele girer. Şifre deneme şifresidir.",
      "Ayarlarda kulüp kendi vurgu rengini seçer. Açık zemin kalır. Renk yalnız o kulübün kaydında durur.",
    ],
    changes: [
      "Eski örnek aidat, stok, zimmet, bildirim ve işlem geçmişi listeden kalktı.",
      "Gecikmiş aidat, aidat ekranındaki açık aylardan gelir.",
      "Programı veya özel dersi olan tesis silinemez.",
      "Kulüp sahibi ve şube müdürü yeni personelin giriş rolü olarak seçilmez.",
    ],
  },
  {
    version: "1.25.0",
    date: "2026-10-29",
    features: [
      "Aidat alırken sporcu ve sezon ayları aynı sayfada seçilir.",
      "Geçmiş ve gelecek aylar sezon sonuna kadar listelenir. Ödenen ay listede kalır.",
      "Ödenmeyen aya basılınca tahsilat açılır. Kısmi seçilirse tutar elle yazılır. Seçilmezse anlaşma tutarı gelir.",
      "Ödemeyi alan seçilebilir. Seçilince kanal ve not yazılır. Not boş kalabilir.",
      "Aidatın ödenen ve kalan tutarı görünür. Özel lig ve forma aidattan ayrı toplanır.",
    ],
    changes: [
      "Ödemeyi alan boşsa kanal sorulmaz.",
      "Aidat dışı kalem aylık aidat satırına karışmaz.",
    ],
  },
  {
    version: "1.24.0",
    date: "2026-10-28",
    features: [
      "Takvimde seçilen dakika, soldaki çizginin yanında küçük yazar. 19:20 çizgide 19:20 görünür.",
    ],
    changes: [
      "Saat başı yazısı durur. Yalnız kayıtlarda geçen dakikalar eklenir.",
    ],
  },
  {
    version: "1.23.0",
    date: "2026-10-28",
    features: [
      "Sol menüde Özel ders vardır.",
      "Öğrenci veya veli adına talep açılır. Kulüp ya da antrenör dersi doğrudan takvime yazar.",
      "Özel ders ücreti ayrıdır ve hocaya göre değişir.",
    ],
    changes: [
      "Takvime yazılan özel ders salon, grup, ad, saat ve hoca ile durur. Salon ve saat kontrolü antrenmanla aynıdır.",
      "Talep, takvime alınmadan takvimde görünmez.",
    ],
  },
  {
    version: "1.22.0",
    date: "2026-10-28",
    features: [
      "Veli, telefon aynı diye başka bir kişiye bağlanmaz. Ad da aynıysa bağlanır.",
      "Takım açarken şube listesi yok. Açılan tesisler gelir. Tesis boş bırakılabilir.",
      "Seans rezervasyonu menüden kalktı.",
    ],
    changes: [
      "Kıvılcım Gültuna, Hümeyra kaydından ayrıldı. Baba bilgisi yeniden yazılır.",
      "Ayarlardaki seans kuralı kalktı.",
    ],
  },
  {
    version: "1.21.0",
    date: "2026-10-28",
    features: [
      "Saat diliminde onar dakikalık ince çizgi var. Kayıt o aralığa oturur.",
      "Aynı saatteki gruplar yan yana sıkışmaz. Kart günün genişliğinde durur.",
      "Sürükleyince kayıt penceresi takvimin üstünde açılır.",
      "Pilates dışında aynı salonda aynı saat çakışmaz. Salon farklıysa başka grup yazılır. Aynı takım iki salona aynı saate yazılmaz.",
    ],
    changes: [
      "Çakışmada “Bu saatte bu salonda … var.” denir ve kayıt olmaz.",
      "Pilates aynı salonda başka grupla durabilir.",
    ],
  },
  {
    version: "1.20.0",
    date: "2026-10-28",
    features: [
      "Takvimde kayıt, yazıldığı dakika aralığında durur. 19:20–20:40 tam saate gömülmez.",
      "Saat çizgileri saat başında kalır. On dakikalık çizgi açılmaz.",
    ],
    changes: [
      "Hafta ve gün görünümünde blok, başlangıçtan bitişe kadar uzar.",
      "Aynı dakikada iki grup yan yana durur.",
    ],
  },
  {
    version: "1.19.0",
    date: "2026-10-27",
    features: [
      "Sol menüde yoklamanın altında Yoklama raporu vardır.",
      "Oyuncu listesi takıma, branşa ve tarihe göre süzülür. Aralık boşsa ay gelir. Hafta ve gün de seçilir.",
      "Takımda katılım sayısı ve oran, takım ile branşta en çok ve en az katılan görünür.",
      "Rapor al görsel PDF ve ayrıntılı Excel indirir.",
    ],
    changes: [
      "İşaretlenmeyen seans katılım sayısına yazılmaz, oranın paydasında durur.",
      "PDF özeti, Excel seans satırını tutar.",
    ],
  },
  {
    version: "1.18.0",
    date: "2026-10-27",
    features: [
      "Yoklamada işaretlenen sporcular kaydolur. Boş bırakılanlar bekler.",
      "Kayıttan sonra aynı sayfada katılanlar ve katılmayanlar ayrı durur.",
    ],
    changes: [
      "Tüm kadronun doldurulması gerekmez.",
      "İzinli sporcu katılmayanlar listesinde görünür.",
    ],
  },
  {
    version: "1.17.0",
    date: "2026-10-27",
    features: [
      "Yoklama, haftalık takvim gibi açılır. Yerleşmiş grup görünür, saati ve salonu buradan değişmez.",
      "Grubun üstünde Yoklama al vardır. O saatin kadrosu Katıldı, Katılmadı ve İzinli olarak yazılır.",
      "Kayıt sporcu kartının Yoklama sekmesine düşer. Veli listesi bildirim merkezinde kuyrukta durur.",
    ],
    changes: [
      "İlk açılışta bütün gruplar gelir. Branş veya salon seçilince yalnız o görünüm kalır.",
      "Yoklama kaydı gönderilmez. Aynı seans yeniden yazılırsa veli listesi güncellenir.",
    ],
  },
  {
    version: "1.16.0",
    date: "2026-10-27",
    features: [
      "Haftalık takvimde salonlar önce birlikte durur. Bir salona basınca yalnız o salon kalır.",
      "Her salonun rengi ayrıdır. Kayıt, bulunduğu salonun rengiyle görünür.",
      "Slota gelen takımın yanında antrenörün adı yazar.",
    ],
    changes: [
      "Sağdaki salon listesi seçilebilir. Tümü ilk seçilidir.",
      "Branş süzgeci durur. Salon süzgeci onun gibi çalışır.",
    ],
  },
  {
    version: "1.15.0",
    date: "2026-10-27",
    features: [
      "Takvim haftalık açılır. Grup, günün saatine sürüklenir.",
      "Bırakınca salon seçilir. Saat serbest yazılır, sabit aralığa kilitlenmez.",
      "Her bırakış ayrı kaydedilebilir ya da hepsi sonda birden kaydedilir.",
      "Aynı saatte birden fazla grup görünür. Branşa tıklayınca yalnız o branş kalır.",
    ],
    changes: [
      "İlk açılışta gün değil hafta gelir. Tümü seçilidir.",
      "Kayıt grubun antrenörüne ve kadrosuna bağlanır.",
    ],
  },
  {
    version: "1.14.0",
    date: "2026-10-27",
    features: [
      "Antrenman serisinde başlangıç ve bitiş tarihi isteğe bağlıdır.",
      "Başlangıç boşsa grubun ilk plan günü kabul edilir. Bitiş boşsa ayın kalan günlerine yerleşir.",
      "Aynı grubun günlerine ayrı salon verilir. Örneğin dört gün bir salon, bir gün başka salon.",
    ],
    changes: [
      "Hafta sayısı kalktı. Bitiş yazılırsa o güne kadar, yazılmazsa ay sonuna kadar durur.",
      "Aynı günlerdeki eski plan, yeni kayıtla değişir. Başka grubun dolu saati yine yazılmaz.",
    ],
  },
  {
    version: "1.13.0",
    date: "2026-10-27",
    features: [
      "Antrenman yerleştirmede saat yazılır, günler seçilir ve seri olarak takvime yerleşir.",
      "Seçilen gün, ilk günden itibaren her hafta aynı saatte tekrarlar.",
      "Dolu saate başka grup yazılamaz. Uyarı, hangi grubun o saati tuttuğunu söyler.",
    ],
    changes: [
      "Tek gün formu yeni yerleştirmede gün tahtasına döndü.",
      "Çakışan seri hiç yazılmaz. Salon, grup veya antrenör aynı saatte bölünmez.",
    ],
  },
  {
    version: "1.12.0",
    date: "2026-10-27",
    features: [
      "Kulübün açmadığı hazır salonlar listeden kalktı.",
    ],
    changes: [
      "Moda Parke, Caferağa Parke ve Bostancı Salon görünmez.",
      "Şehit Haydar ÇETİN Anadolu Lisesi ve Cezeri salonu durur.",
      "Bu hazır salonlara bağlı örnek antrenmanlar takvimden kalktı.",
    ],
  },
  {
    version: "1.11.0",
    date: "2026-10-27",
    features: [
      "Kadrodan çıkarma hemen olmaz. Önce uyarı gelir, onaydan sonra sporcu takımdan alınır.",
    ],
    changes: [
      "Onaylanmadan kadro değişmez. Sporcu kaydı silinmez, yalnız o takımdan çıkar.",
      "Onay yazısı pencerenin içine sığar, satır dışına taşmaz.",
    ],
  },
  {
    version: "1.10.0",
    date: "2026-10-27",
    features: [
      "Sporcu kaydının altında da Kaydet vardır.",
      "Kayıt bitince özet penceresi açılır ve okunacak kadar durup kapanır.",
      "Bilgi girilip listeye dönülürse önce kaydedilmedi uyarısı, sonra çıkış onayı gelir.",
    ],
    changes: [
      "Üstteki Kaydet ve Listeye geri dön durur. Alttaki Kaydet aynı kaydı yapar.",
      "Form boşsa listeye dönüş sormaz. Yazılmış bilgi varsa iki adımda sorar.",
    ],
  },
  {
    version: "1.9.0",
    date: "2026-10-27",
    features: [
      "Takım kartındaki kadrodan sporcu kartı açılır.",
      "Takım özellikleri ile sporcu özellikleri aynı sayfada iki sekmedir.",
      "Kadro satırında, kadrodan çıkarmanın yanında sporcu kartı simgesi vardır.",
    ],
    changes: [
      "Sporcu adı bu karttan sporcular listesine çıkmaz. Kart takım sayfasında kalır.",
      "Ölçü, not ve geçmiş bu sekmede kaydedilince takım kartında kalınır.",
    ],
  },
  {
    version: "1.8.0",
    date: "2026-10-27",
    features: [
      "Sporcu kaydında doğum yılı, bu yıldan geriye doğru listeden seçilir.",
      "Doğum günü istenirse gün ve ay olarak yazılır. Zorunlu değildir.",
      "Veli telefonu Türkiye biçimindedir: 0(xxx) xxx-xx-xx.",
    ],
    changes: [
      "Doğum yılı elle sayı olarak yazılmaz.",
      "Doğum günü boş kalabilir. Doluysa gün ve ay birlikte durur.",
      "Anne, baba ve acil telefon bu biçimin dışında kaydedilmez.",
    ],
  },
  {
    version: "1.7.0",
    date: "2026-10-27",
    features: [
      "Sporcu kartı sekmelerle açılır: özet, aidat, ölçü, not ve basket geçmişi.",
      "Unvan yalnız addır. Personel ad, unvan, branş, telefon ve tesis ile açılır.",
      "Takımda bir antrenör zorunludur. Boşsa başantrenör gelir. Ek antrenör ayrıca yazılır.",
      "Antrenman takvimi gün, hafta ve ay gösterir. Yerleştirme ayrı sayfada kaydedilir.",
      "O antrenmanın kadrosu, takımın antrenör listesini değiştirmeden tutulur.",
      "Maç türü modelde durur. Maç formu henüz açılmaz.",
    ],
    changes: [
      "Personel sayfasının sağ üstünde yalnız yeni personel vardır.",
      "Unvan listesinde kapsam ve seçim sütunu yoktur.",
      "Tesis, şube listesinden değil tesis listesinden seçilir. Tesis yok bırakılabilir.",
      "Takvim hücresi kaydetmez. Geçmiş seans yeniden yazılmaz. Çakışan salon engellenir.",
    ],
  },
  {
    version: "1.6.0",
    date: "2026-10-27",
    features: [
      "Unvanlar ayrı sayfadadır. Kulüp yeni unvan ekler, adını düzeltir.",
      "Her unvanın kapsamı vardır: yönetim, antrenör kadrosu veya tahsilat.",
      "Takım antrenörü, antrenör kadrosundaki personelden seçilir.",
      "Tahsilat kapsamındaki personel aidat listesinde görünür.",
    ],
    changes: [
      "Dört hazır unvan durur: kulüp başkanı, başantrenör, antrenör, mali işler yetkili. Liste bunlarla kilitli değildir.",
      "Personel formuna unvan ekleme gömülmez. Unvan, kendi sayfasında kaydedilir.",
      "Giriş rolü ve ekran yetkisi değişmez. Kulüp sahibi adı durur.",
      "Personelde kayıtlı unvan silinemez. Eski unvan, personel düzeltilmezse listede kalır.",
    ],
  },
  {
    version: "1.5.0",
    date: "2026-10-26",
    features: [
      "Sporcu kartı listeden ayrı açılır. Boy, kilo, not ve basket geçmişi kartta takip edilir.",
      "Takım listeden ayrı açılır. Kadro, takım kartının içinde ayrıca kaydedilir.",
      "Takım türü spor okulu veya takımdır. Sezon, sistemin açtığı yıl çiftinden seçilir. Şube boş kalabilir.",
      "Personel unvanı kulüp başkanı, başantrenör, antrenör veya mali işler yetkili olur.",
    ],
    changes: [
      "Sporcu adı ve Kart, takip sayfasını açar. Düzelt yalnız kayıt formunu açar.",
      "Karttaki başlangıç, aylık ölçü, not ve geçmişin her birinin kendi kaydı vardır.",
      "Takım açmak kadro yazmak değildir. Sporcu ekleme ve çıkarma takım kartında kaydedilir.",
      "Takım formunda kategori yoktur. Tür, Takım oyuncusu diye yazılmaz. Şube seçilmezse ilk şube atanmaz.",
      "Personel önce listelenir. Yeni kayıt sağ üstten, düzeltme satırdan açılır ve içeride kaydedilir.",
      "Takım antrenörü yalnız başantrenör ve antrenörden seçilir. Aidat tarafındaki personel unvanı mali işler yetkilidir.",
      "Eski personel unvanları listede durur. Yeni seçim listesinde yoktur.",
    ],
  },
  {
    version: "1.4.0",
    date: "2026-10-26",
    features: [
      "Aidat ay ay açılır. Geçmiş ve gelecek aylar aynı ekranda durur.",
      "Sporcu listesi ve takım listesi ayrıdır. Takımın toplamı da görünür.",
      "Aidat tutarı sporcunun fiyat anlaşmasından gelir. Ay için ayrıca yazılabilir.",
      "Tahsilat günü ve türü yazılır: nakit, havale veya kart.",
      "Kısmi ödeme kalır. Yeni ödeme eklenir, yanlış ödeme çıkarılır.",
    ],
    changes: [
      "Ara veren ve ayrılan sporcuya bu ay ve sonrası otomatik aidat açılmaz. Geçmiş ayları durur.",
      "Anlaşması olmayan sporcuda tutar boş kalır. Fiyat kayıttan gelince aylar dolar.",
      "Ücretsiz anlaşma o ayı ücretsiz gösterir.",
      "Aidat listesi sporcu listesi gibi açılır. Ay süzgeci vardır. Tahsilat, sağ üstteki Aidat al ile içeride yönetilir.",
    ],
  },
  {
    version: "1.3.0",
    date: "2026-10-26",
    features: [
      "Tesis, branş, fiyat ve sporcu kayıtları önce listelenir. Yeni kayıt sağ üstten, düzeltme satırdan açılır.",
      "Tesis adı, türü ve kapasitesi düzenlenir. Programı olan tesis silinemez.",
      "Branş adı yazılır ve yıl çifti sezon seçilir. Sezonu sistem yöneticisi açar.",
      "Fiyat adı ve tutarı düzenlenir. Sporcu kaydı bu listeden ücret seçer.",
      "Kayıtta anne ve baba ayrı tutulur. Listede görünen ana veli kaydı yapan seçer.",
      "Acil yakın istenirse yazılır. Zorunlu değildir.",
      "İndirim, yüzde listesinden seçilir veya özel fiyat yazılır.",
      "Sporcu listesi tür, branş, grup, ücret, kayıt tarihi ve duruma göre süzülür.",
      "Excel, kayıtta alınan bütün alanlarla iner. Süzgeç varsa yalnız görünen satırlar iner.",
    ],
    changes: [
      "Şube kaydı şimdilik yok. Tesis doğrudan açılır.",
      "Sezon elle yazılmaz. Başlangıç ve bitiş kulüp tarafından girilmez. Yürüyüş seçilmez.",
      "Açılan branşın adı düzeltilebilir.",
      "Kayıtlarda kullanılan fiyat silinemez.",
      "Anne veya babadan biri yeter. Seçilen veli listelerde görünür.",
      "Yüzde indirimi küçükten büyüğe gider. Ücretsiz (%100 burslu) listenin sonundadır.",
      "Kayıt tarihi gün, ay ve yıl olarak yazılır. Yanındaki sütun kaç yıldır kayıtlı olduğunu gösterir.",
      "Seçilen liste filtreleri temizlenebilir.",
    ],
  },
  {
    version: "1.2.0",
    date: "2026-10-26",
    features: [
      "Kulüp sahibi şube açar: ad, ilçe ve adres.",
      "Her şubeye tesis eklenir. Tür salon, saha, stüdyo veya havuz olabilir; kapasite girilir.",
      "Boş şube ve kullanılmayan tesis çıkarılır.",
      "Versionlar her kulüp sitesinin sol menüsünde durur. Her sürüm özellikleri ve değişiklikleri ayrı listeler.",
    ],
    changes: [
      "Kadro, seans, depo veya duran bir tesis varken şube çıkmaz.",
      "Seansın kullandığı tesis çıkmaz.",
      "Aynı adda şube, aynı şubede aynı adda tesis tekrar açılmaz.",
    ],
  },
  {
    version: "1.1.0",
    date: "2026-10-26",
    features: [
      "Kulüp sitesi kendi adresinde açılır. Yerel adres de bu kulübün sitesidir.",
      "Giriş yalnız bu kulübün web personelini kabul eder.",
    ],
    changes: [
      "Görünen kulüp adı Yeni Ufuklar. Logo, kırmızı düğme ve lacivert giriş kullanılır.",
      "Yönetim ekranı açık kaldı: beyaz menü, açık sayfa, beyaz kartlar.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026-10-26",
    features: [
      "Sporcu ve üye, takım, antrenman takvimi, yoklama ve seans rezervasyonu.",
      "Stok, zimmet, aidat ve personel.",
      "Bildirim, rapor ve işlem geçmişi.",
      "Ekran yetkileri: sahip, yönetici, şube müdürü, finans, depo ve antrenör.",
    ],
    changes: [
      "Şube müdürü yalnız yetkili şubesinin kayıtlarını görür.",
      "Antrenör yalnız atandığı grubu görür.",
    ],
  },
];

export function currentProductVersion() {
  return productVersions[0];
}
