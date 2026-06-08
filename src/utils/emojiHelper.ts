/**
 * Automatically find a relevant emoji for a given food name.
 * Uses a keyword dictionary optimized for Korean food names and terms.
 */
export function getEmojiForFoodName(name: string): string {
  const normalized = name.toLowerCase();

  // Rice & Grains
  if (
    normalized.includes('현미') ||
    normalized.includes('백미') ||
    normalized.includes('햇반') ||
    normalized.includes('곤약밥') ||
    normalized.includes('볶음밥') ||
    normalized.includes('덮밥') ||
    normalized.includes('주먹밥') ||
    normalized.includes('김밥') ||
    normalized.includes('초밥') ||
    normalized.includes('롤') ||
    normalized.includes('스시') ||
    normalized.includes('귀리') ||
    normalized.includes('오트밀') ||
    normalized.includes('보리') ||
    normalized.includes('잡곡') ||
    normalized.includes('누룽지') ||
    normalized.includes('떡')
  ) {
    return '🍚';
  }

  // Chicken & Poultry & Egg
  if (
    normalized.includes('닭') ||
    normalized.includes('치킨') ||
    normalized.includes('가슴살') ||
    normalized.includes('닭발') ||
    normalized.includes('닭다리') ||
    normalized.includes('닭날개') ||
    normalized.includes('윙') ||
    normalized.includes('봉') ||
    normalized.includes('삼계탕') ||
    normalized.includes('백숙') ||
    normalized.includes('안심살')
  ) {
    return '🍗';
  }

  if (
    normalized.includes('계란') ||
    normalized.includes('달걀') ||
    normalized.includes('란') ||
    normalized.includes('구운란') ||
    normalized.includes('노른자') ||
    normalized.includes('흰자') ||
    normalized.includes('메추리알') ||
    normalized.includes('후라이')
  ) {
    return '🥚';
  }

  // Beef & Steaks
  if (
    normalized.includes('소') ||
    normalized.includes('등심') ||
    normalized.includes('안심') ||
    normalized.includes('갈비') ||
    normalized.includes('토시') ||
    normalized.includes('살치') ||
    normalized.includes('부채') ||
    normalized.includes('차돌') ||
    normalized.includes('채끝') ||
    normalized.includes('사태') ||
    normalized.includes('우둔') ||
    normalized.includes('육회') ||
    normalized.includes('스테이크') ||
    normalized.includes('한우')
  ) {
    return '🥩';
  }

  // Pork & Bacon
  if (
    normalized.includes('돼지') ||
    normalized.includes('삼겹') ||
    normalized.includes('목살') ||
    normalized.includes('대패') ||
    normalized.includes('가브리') ||
    normalized.includes('항정') ||
    normalized.includes('갈매기') ||
    normalized.includes('족발') ||
    normalized.includes('돈까스') ||
    normalized.includes('탕수육') ||
    normalized.includes('제육')
  ) {
    return '🥓';
  }

  // Other meats / Duck / Sausage / Ham
  if (normalized.includes('오리') || normalized.includes('훈제오리')) {
    return '🦆';
  }
  if (normalized.includes('양고기') || normalized.includes('양갈비') || normalized.includes('램')) {
    return '🍖';
  }
  if (
    normalized.includes('소시지') ||
    normalized.includes('소세지') ||
    normalized.includes('핫바') ||
    normalized.includes('비엔나') ||
    normalized.includes('스팸') ||
    normalized.includes('햄') ||
    normalized.includes('베이컨')
  ) {
    return '🌭';
  }

  // Noodles & Ramen
  if (
    normalized.includes('라면') ||
    normalized.includes('컵라면') ||
    normalized.includes('신라면') ||
    normalized.includes('진라면') ||
    normalized.includes('불닭') ||
    normalized.includes('너구리') ||
    normalized.includes('사발면') ||
    normalized.includes('짜파게티') ||
    normalized.includes('비빔면') ||
    normalized.includes('안성탕면') ||
    normalized.includes('삼양라면') ||
    normalized.includes('컵누들') ||
    normalized.includes('소컵')
  ) {
    return '🍜';
  }

  if (
    normalized.includes('국수') ||
    normalized.includes('우동') ||
    normalized.includes('소면') ||
    normalized.includes('칼국수') ||
    normalized.includes('밀면') ||
    normalized.includes('소바') ||
    normalized.includes('냉면') ||
    normalized.includes('파스타') ||
    normalized.includes('스파게티') ||
    normalized.includes('당면') ||
    normalized.includes('쫄면') ||
    normalized.includes('자장면') ||
    normalized.includes('짬뽕') ||
    normalized.includes('곤약면') ||
    normalized.includes('미역국수') ||
    normalized.includes('두부면')
  ) {
    return '🍝';
  }

  // Seafood
  if (
    normalized.includes('연어') ||
    normalized.includes('고등어') ||
    normalized.includes('광어') ||
    normalized.includes('우럭') ||
    normalized.includes('회') ||
    normalized.includes('생선') ||
    normalized.includes('참치') ||
    normalized.includes('갈치') ||
    normalized.includes('굴비') ||
    normalized.includes('삼치') ||
    normalized.includes('조기') ||
    normalized.includes('굴') ||
    normalized.includes('장어')
  ) {
    return '🐟';
  }

  if (normalized.includes('새우') || normalized.includes('대하') || normalized.includes('쉬림프')) {
    return '🦐';
  }
  if (normalized.includes('게') || normalized.includes('크랩') || normalized.includes('꽃게')) {
    return '🦀';
  }
  if (
    normalized.includes('오징어') ||
    normalized.includes('낙지') ||
    normalized.includes('쭈꾸미') ||
    normalized.includes('꼴뚜기')
  ) {
    return '🦑';
  }
  if (normalized.includes('문어') || normalized.includes('타코')) {
    return '🐙';
  }
  if (
    normalized.includes('전복') ||
    normalized.includes('소라') ||
    normalized.includes('홍합') ||
    normalized.includes('가리비') ||
    normalized.includes('조개') ||
    normalized.includes('바지락')
  ) {
    return '🦪';
  }

  // Bakery & Bread
  if (
    normalized.includes('식빵') ||
    normalized.includes('베이글') ||
    normalized.includes('슬랩') ||
    normalized.includes('크루아상') ||
    normalized.includes('바게트') ||
    normalized.includes('소금빵') ||
    normalized.includes('모닝빵') ||
    normalized.includes('단팥빵') ||
    normalized.includes('토스트') ||
    normalized.includes('빵') ||
    normalized.includes('샌드위치') ||
    normalized.includes('머핀') ||
    normalized.includes('와플') ||
    normalized.includes('케이크') ||
    normalized.includes('스콘')
  ) {
    return '🍞';
  }

  // Dairy & Drinks
  if (normalized.includes('요거트') || normalized.includes('그릭')) {
    return '🥣';
  }
  if (
    normalized.includes('우유') ||
    normalized.includes('두유') ||
    normalized.includes('라떼') ||
    normalized.includes('밀크') ||
    normalized.includes('아몬드 브리즈') ||
    normalized.includes('오트밀크')
  ) {
    return '🥛';
  }
  if (
    normalized.includes('커피') ||
    normalized.includes('아메리카노') ||
    normalized.includes('티') ||
    normalized.includes('차') ||
    normalized.includes('녹차') ||
    normalized.includes('홍차')
  ) {
    return '☕';
  }
  if (
    normalized.includes('탄산') ||
    normalized.includes('콜라') ||
    normalized.includes('사이다') ||
    normalized.includes('주스') ||
    normalized.includes('에이드') ||
    normalized.includes('맥주') ||
    normalized.includes('소주') ||
    normalized.includes('와인') ||
    normalized.includes('음료')
  ) {
    return '🥤';
  }
  if (normalized.includes('치즈')) {
    return '🧀';
  }

  // Vegetables & Salads & Nuts
  if (
    normalized.includes('아몬드') ||
    normalized.includes('호두') ||
    normalized.includes('캐슈넛') ||
    normalized.includes('견과') ||
    normalized.includes('땅콩') ||
    normalized.includes('피넛')
  ) {
    return '🥜';
  }
  if (normalized.includes('아보카도')) {
    return '🥑';
  }
  if (normalized.includes('방울토마토') || normalized.includes('토마토')) {
    return '🍅';
  }
  if (normalized.includes('오이')) {
    return '🥒';
  }
  if (normalized.includes('당근')) {
    return '🥕';
  }
  if (normalized.includes('고구마') || normalized.includes('감자')) {
    return '🍠';
  }
  if (
    normalized.includes('샐러드') ||
    normalized.includes('양배추') ||
    normalized.includes('브로콜리') ||
    normalized.includes('양파') ||
    normalized.includes('버섯') ||
    normalized.includes('채소') ||
    normalized.includes('야채') ||
    normalized.includes('시금치') ||
    normalized.includes('상추') ||
    normalized.includes('깻잎') ||
    normalized.includes('마늘')
  ) {
    return '🥗';
  }

  // Fruit
  if (normalized.includes('사과') || normalized.includes('애플')) {
    return '🍎';
  }
  if (normalized.includes('바나나')) {
    return '🍌';
  }
  if (normalized.includes('딸기') || normalized.includes('스트로베리')) {
    return '🍓';
  }
  if (normalized.includes('블루베리')) {
    return '🫐';
  }
  if (normalized.includes('귤') || normalized.includes('오렌지') || normalized.includes('자몽')) {
    return '🍊';
  }
  if (normalized.includes('수박')) {
    return '🍉';
  }
  if (normalized.includes('포도')) {
    return '🍇';
  }
  if (normalized.includes('체리')) {
    return '🍒';
  }
  if (normalized.includes('참외') || normalized.includes('메론')) {
    return '🍈';
  }
  if (normalized.includes('복숭아')) {
    return '🍑';
  }
  if (normalized.includes('파인애플')) {
    return '🍍';
  }

  // Pizza / Burger / Dumpling / Soups / Stews
  if (normalized.includes('피자')) {
    return '🍕';
  }
  if (normalized.includes('햄버거') || normalized.includes('버거')) {
    return '🍔';
  }
  if (normalized.includes('만두')) {
    return '🥟';
  }
  if (
    normalized.includes('찌개') ||
    normalized.includes('탕') ||
    normalized.includes('국') ||
    normalized.includes('수프') ||
    normalized.includes('스프') ||
    normalized.includes('전골')
  ) {
    return '🍲';
  }

  // Snacks & Protein Bars
  if (
    normalized.includes('과자') ||
    normalized.includes('쿠키') ||
    normalized.includes('스낵') ||
    normalized.includes('비스킷') ||
    normalized.includes('팝콘') ||
    normalized.includes('초콜릿') ||
    normalized.includes('초코') ||
    normalized.includes('캔디') ||
    normalized.includes('프로틴바') ||
    normalized.includes('젤리')
  ) {
    return '🍫';
  }

  return '✨'; // General fallback
}
