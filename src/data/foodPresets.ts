import { FoodPreset } from '../types';

const QUICK_FOODS = [
  // 🛒 1. 커클랜드 (Costco) & 프로틴 간식류
  { id: 'k1', icon: '🥜', name: '커클랜드 땅콩버터', grams: 20, calories: 125, carbs: 3.8, protein: 5, fat: 9.4, cat: 'snack' },
  { id: 'k2', icon: '🍫', name: '커클랜드 츄이 프로틴바', grams: 40, calories: 190, carbs: 16, protein: 10, fat: 11, cat: 'snack' },
  { id: 'k3', icon: '🍪', name: '커클랜드 단백질바 (쿠키도우)', grams: 60, calories: 190, carbs: 22, protein: 21, fat: 7, cat: 'snack' },
  { id: 'k4', icon: '🥣', name: '커클랜드 무지방 그릭요거트', grams: 100, calories: 57, carbs: 4, protein: 10, fat: 0, cat: 'snack' },
  { id: 'k5', icon: '🥛', name: '커클랜드 프로틴 쉐이크', grams: 325, calories: 160, carbs: 5, protein: 30, fat: 3, cat: 'snack' },
  { id: 'k6', icon: '🍿', name: '커클랜드 전자레인지 팝콘', grams: 44, calories: 190, carbs: 24, protein: 4, fat: 12, cat: 'snack' },
  { id: 'k7', icon: '🥩', name: '커클랜드 비프 스테이크 스트립', grams: 28, calories: 70, carbs: 2, protein: 14, fat: 1, cat: 'snack' },
  { id: 'p1', icon: '🍫', name: '퀘스트 프로틴바', grams: 60, calories: 190, carbs: 21, protein: 21, fat: 8, cat: 'snack' },
  { id: 'p2', icon: '🥤', name: '셀렉스 프로틴 음료', grams: 330, calories: 99, carbs: 5, protein: 20, fat: 0, cat: 'snack' },
  { id: 'p3', icon: '🥛', name: '마이프로틴 웨이 아이솔레이트 (1스쿱)', grams: 25, calories: 90, carbs: 1, protein: 22, fat: 0, cat: 'snack' },
  { id: 'p4', icon: '🥛', name: '신타6 프로틴 (1스쿱)', grams: 47, calories: 200, carbs: 15, protein: 22, fat: 6, cat: 'snack' },
  { id: 'p5', icon: '🍫', name: '랩노쉬 단백질바', grams: 50, calories: 180, carbs: 18, protein: 15, fat: 7, cat: 'snack' },

  // 🍚 2. 시판 탄수화물 & 자연 곡물
  { id: 'c1', icon: '🍚', name: '햇반 (백미)', grams: 210, calories: 315, carbs: 67, protein: 5, fat: 1, cat: 'carbs' },
  { id: 'c2', icon: '🌾', name: '햇반 (발아현미)', grams: 210, calories: 315, carbs: 66, protein: 6, fat: 2, cat: 'carbs' },
  { id: 'c3', icon: '🍚', name: '햇반 (작은공기)', grams: 130, calories: 190, carbs: 41, protein: 3, fat: 1, cat: 'carbs' },
  { id: 'c4', icon: '🍚', name: '오뚜기 맛있는 밥', grams: 210, calories: 305, carbs: 65, protein: 6, fat: 1, cat: 'carbs' },
  { id: 'c5', icon: '🍠', name: '고구마 (찐것)', grams: 100, calories: 130, carbs: 30, protein: 1, fat: 0, cat: 'carbs' },
  { id: 'c6', icon: '🍠', name: '고구마 (군것 - 당도높음)', grams: 100, calories: 160, carbs: 36, protein: 2, fat: 0, cat: 'carbs' },
  { id: 'c7', icon: '🥔', name: '감자 (찐것)', grams: 100, calories: 85, carbs: 20, protein: 2, fat: 0, cat: 'carbs' },
  { id: 'c8', icon: '🎃', name: '단호박 (찐것)', grams: 100, calories: 65, carbs: 15, protein: 1, fat: 0, cat: 'carbs' },
  { id: 'c9', icon: '🌾', name: '오트밀 (귀리)', grams: 50, calories: 190, carbs: 34, protein: 7, fat: 3, cat: 'carbs' },
  { id: 'c10', icon: '🍞', name: '통밀식빵 (1장)', grams: 35, calories: 90, carbs: 17, protein: 4, fat: 1, cat: 'carbs' },
  { id: 'c11', icon: '🍞', name: '베이글 (플레인)', grams: 100, calories: 270, carbs: 53, protein: 10, fat: 1, cat: 'carbs' },
  { id: 'c12', icon: '🍝', name: '통밀 파스타면 (건면)', grams: 100, calories: 350, carbs: 70, protein: 14, fat: 2, cat: 'carbs' },
  { id: 'c15', icon: '🍝', name: '듀럼밀 파스타 (건면)', grams: 100, calories: 355, carbs: 73, protein: 12, fat: 1.5, cat: 'carbs' },

  // 🍜 2.5 라면 & 국수 & 메밀류 (면류)
  { id: 'nd1', icon: '🍜', name: '신라면 (봉지면)', grams: 120, calories: 500, carbs: 79, protein: 10, fat: 16, cat: 'carbs' },
  { id: 'nd2', icon: '🌶️', name: '열라면 (봉지면)', grams: 120, calories: 510, carbs: 77, protein: 11, fat: 17, cat: 'carbs' },
  { id: 'nd3', icon: '🍜', name: '진라면 매운맛 (봉지면)', grams: 120, calories: 500, carbs: 77, protein: 12, fat: 16, cat: 'carbs' },
  { id: 'nd4', icon: '🍜', name: '안성탕면 (봉지면)', grams: 125, calories: 525, carbs: 82, protein: 11, fat: 17, cat: 'carbs' },
  { id: 'nd5', icon: '🍛', name: '짜파게티 (봉지면)', grams: 140, calories: 610, carbs: 97, protein: 11, fat: 20, cat: 'carbs' },
  { id: 'nd6', icon: '🔥', name: '불닭볶음면 (봉지면)', grams: 140, calories: 530, carbs: 85, protein: 9, fat: 16, cat: 'carbs' },
  { id: 'nd7', icon: '🍝', name: '팔도비빔면 (봉지면)', grams: 130, calories: 530, carbs: 80, protein: 9, fat: 19, cat: 'carbs' },
  { id: 'nd8', icon: '🍜', name: '너구리 우동 (봉지면)', grams: 120, calories: 490, carbs: 79, protein: 9, fat: 15, cat: 'carbs' },
  { id: 'nd9', icon: '🍜', name: '삼양라면 (봉지면)', grams: 120, calories: 500, carbs: 78, protein: 10, fat: 16, cat: 'carbs' },
  { id: 'nd10', icon: '🥤', name: '신라면 소컵 (컵라면)', grams: 65, calories: 300, carbs: 44, protein: 5, fat: 10, cat: 'carbs' },
  { id: 'nd11', icon: '🥤', name: '육개장 사발면 (컵라면)', grams: 86, calories: 375, carbs: 53, protein: 7, fat: 15, cat: 'carbs' },
  { id: 'nd12', icon: '🥤', name: '컵누들 매콤한맛', grams: 38, calories: 120, carbs: 27, protein: 1, fat: 0.5, cat: 'carbs' },
  { id: 'nd13', icon: '🥤', name: '컵누들 우동맛', grams: 38, calories: 120, carbs: 28, protein: 1, fat: 0.5, cat: 'carbs' },
  { id: 'nd14', icon: '🍜', name: '메밀소바 (삶은면)', grams: 100, calories: 130, carbs: 27, protein: 5, fat: 1, cat: 'carbs' },
  { id: 'nd15', icon: '🍜', name: '잔치국수 소면 (삶은면)', grams: 100, calories: 130, carbs: 28, protein: 4, fat: 0.2, cat: 'carbs' },
  { id: 'nd16', icon: '🍜', name: '칼국수면 (삶은면)', grams: 100, calories: 140, carbs: 30, protein: 4.5, fat: 0.3, cat: 'carbs' },
  { id: 'nd17', icon: '🍜', name: '우동면 (삶은면)', grams: 200, calories: 280, carbs: 62, protein: 6, fat: 0.5, cat: 'carbs' },
  { id: 'nd18', icon: '🥗', name: '미역국수/곤약면 (다이어트)', grams: 150, calories: 20, carbs: 4, protein: 0.5, fat: 0, cat: 'carbs' },
  { id: 'nd19', icon: '🍜', name: '물냉면 (한그릇)', grams: 500, calories: 420, carbs: 88, protein: 12, fat: 2, cat: 'carbs' },
  { id: 'nd20', icon: '🍜', name: '비빔냉면 (한그릇)', grams: 350, calories: 520, carbs: 105, protein: 11, fat: 6, cat: 'carbs' },
  { id: 'nd21', icon: '🍜', name: '비빔국수 (한그릇)', grams: 300, calories: 480, carbs: 90, protein: 12, fat: 8, cat: 'carbs' },
  { id: 'nd22', icon: '🍲', name: '칼국수 (완조리 한그릇)', grams: 600, calories: 550, carbs: 102, protein: 21, fat: 5, cat: 'carbs' },

  // 🥩 3. 소고기 (부위별 100g 기준)
  { id: 'b1', icon: '🥩', name: '소고기 안심 (구이용)', grams: 100, calories: 150, carbs: 0, protein: 21, fat: 7, cat: 'beef' },
  { id: 'b2', icon: '🥩', name: '소고기 등심 (마블링)', grams: 100, calories: 240, carbs: 0, protein: 20, fat: 17, cat: 'beef' },
  { id: 'b3', icon: '🥩', name: '소고기 우둔살 (육회/장조림)', grams: 100, calories: 130, carbs: 0, protein: 22, fat: 4, cat: 'beef' },
  { id: 'b4', icon: '🥩', name: '소고기 부채살', grams: 100, calories: 190, carbs: 0, protein: 20, fat: 12, cat: 'beef' },
  { id: 'b5', icon: '🥩', name: '소고기 차돌박이', grams: 100, calories: 370, carbs: 0, protein: 15, fat: 35, cat: 'beef' },
  { id: 'b6', icon: '🥩', name: '소고기 살치살', grams: 100, calories: 330, carbs: 0, protein: 16, fat: 29, cat: 'beef' },
  { id: 'b7', icon: '🥩', name: '소고기 갈비살', grams: 100, calories: 300, carbs: 0, protein: 17, fat: 25, cat: 'beef' },
  { id: 'b8', icon: '🥩', name: '소고기 채끝살', grams: 100, calories: 210, carbs: 0, protein: 20, fat: 14, cat: 'beef' },
  { id: 'b9', icon: '🥩', name: '소고기 사태 (수육/찜)', grams: 100, calories: 130, carbs: 0, protein: 23, fat: 4, cat: 'beef' },

  // 🥓 4. 돼지고기 (부위별 100g 기준)
  { id: 'pk1', icon: '🥓', name: '돼지고기 삼겹살', grams: 100, calories: 330, carbs: 0, protein: 14, fat: 28, cat: 'pork' },
  { id: 'pk2', icon: '🥓', name: '돼지고기 목살', grams: 100, calories: 270, carbs: 0, protein: 17, fat: 21, cat: 'pork' },
  { id: 'pk3', icon: '🥓', name: '돼지고기 안심 (수육용)', grams: 100, calories: 120, carbs: 0, protein: 21, fat: 3, cat: 'pork' },
  { id: 'pk4', icon: '🥓', name: '돼지고기 뒷다리살 (후지)', grams: 100, calories: 140, carbs: 0, protein: 20, fat: 5, cat: 'pork' },
  { id: 'pk5', icon: '🥓', name: '돼지고기 앞다리살 (전지)', grams: 100, calories: 180, carbs: 0, protein: 18, fat: 11, cat: 'pork' },
  { id: 'pk6', icon: '🥓', name: '돼지고기 항정살', grams: 100, calories: 380, carbs: 0, protein: 13, fat: 36, cat: 'pork' },
  { id: 'pk7', icon: '🥓', name: '돼지고기 갈매기살', grams: 100, calories: 190, carbs: 0, protein: 19, fat: 12, cat: 'pork' },
  { id: 'pk8', icon: '🥓', name: '돼지고기 가브리살', grams: 100, calories: 260, carbs: 0, protein: 17, fat: 21, cat: 'pork' },

  // 🍖 5. 양고기 & 오리고기 & 가공육
  { id: 'l1', icon: '🍖', name: '양갈비 (프렌치랙)', grams: 100, calories: 250, carbs: 0, protein: 18, fat: 19, cat: 'meat_etc' },
  { id: 'l2', icon: '🍖', name: '양고기 (숄더랙)', grams: 100, calories: 280, carbs: 0, protein: 17, fat: 23, cat: 'meat_etc' },
  { id: 'd1', icon: '🦆', name: '오리고기 (로스구이용)', grams: 100, calories: 300, carbs: 0, protein: 16, fat: 26, cat: 'meat_etc' },
  { id: 'd2', icon: '🦆', name: '훈제오리', grams: 100, calories: 320, carbs: 1, protein: 15, fat: 28, cat: 'meat_etc' },
  { id: 'hm1', icon: '🌭', name: '닭가슴살 소시지', grams: 100, calories: 130, carbs: 3, protein: 18, fat: 5, cat: 'meat_etc' },
  { id: 'hm2', icon: '🥓', name: '베이컨 (구운것)', grams: 30, calories: 160, carbs: 0, protein: 11, fat: 12, cat: 'meat_etc' },

  // 🐔 6. 닭고기 & 계란
  { id: 'ch1', icon: '🐔', name: '닭가슴살 (생육)', grams: 100, calories: 110, carbs: 0, protein: 23, fat: 1, cat: 'chicken_egg' },
  { id: 'ch2', icon: '🍗', name: '닭다리살 (정육)', grams: 100, calories: 170, carbs: 0, protein: 18, fat: 10, cat: 'chicken_egg' },
  { id: 'ch3', icon: '🐔', name: '닭안심살', grams: 100, calories: 105, carbs: 0, protein: 22, fat: 1, cat: 'chicken_egg' },
  { id: 'ch4', icon: '🍗', name: '닭날개 (윙/봉)', grams: 100, calories: 210, carbs: 0, protein: 18, fat: 15, cat: 'chicken_egg' },
  { id: 'ch5', icon: '🥚', name: '계란후라이 (1개)', grams: 50, calories: 90, carbs: 1, protein: 6, fat: 7, cat: 'chicken_egg' },
  { id: 'ch6', icon: '🥚', name: '삶은계란 (대란 1개)', grams: 50, calories: 70, carbs: 1, protein: 6, fat: 5, cat: 'chicken_egg' },
  { id: 'ch7', icon: '🥚', name: '계란 흰자 (1개분)', grams: 35, calories: 15, carbs: 0, protein: 4, fat: 0, cat: 'chicken_egg' },
  { id: 'ch8', icon: '🥚', name: '구운란/찜질방계란', grams: 45, calories: 65, carbs: 1, protein: 6, fat: 4, cat: 'chicken_egg' },

  // 🐟 7. 수산물 (생선 & 해산물 100g 기준)
  { id: 'sf1', icon: '🐟', name: '생연어', grams: 100, calories: 200, carbs: 0, protein: 20, fat: 13, cat: 'seafood' },
  { id: 'sf2', icon: '🐟', name: '훈제연어', grams: 100, calories: 170, carbs: 0, protein: 21, fat: 9, cat: 'seafood' },
  { id: 'sf3', icon: '🐟', name: '고등어 (구이)', grams: 100, calories: 260, carbs: 0, protein: 24, fat: 18, cat: 'seafood' },
  { id: 'sf4', icon: '🐟', name: '광어 (회)', grams: 100, calories: 100, carbs: 0, protein: 20, fat: 2, cat: 'seafood' },
  { id: 'sf5', icon: '🐟', name: '우럭 (회)', grams: 100, calories: 105, carbs: 0, protein: 19, fat: 3, cat: 'seafood' },
  { id: 'sf6', icon: '🦑', name: '오징어 (데친것)', grams: 100, calories: 90, carbs: 1, protein: 18, fat: 1, cat: 'seafood' },
  { id: 'sf7', icon: '🦐', name: '새우 (생물)', grams: 100, calories: 90, carbs: 0, protein: 20, fat: 1, cat: 'seafood' },
  { id: 'sf8', icon: '🐟', name: '참치캔 (살코기/기름뺀것)', grams: 100, calories: 130, carbs: 0, protein: 26, fat: 3, cat: 'seafood' },
  { id: 'sf9', icon: '🐙', name: '문어 (숙회)', grams: 100, calories: 85, carbs: 1, protein: 16, fat: 1, cat: 'seafood' },
  { id: 'sf10',icon: '🦪', name: '전복 (생물)', grams: 100, calories: 80, carbs: 3, protein: 15, fat: 1, cat: 'seafood' },

  // 🥗 8. 채소 & 버섯 & 견과류
  { id: 'v1', icon: '🥑', name: '아보카도 (반 개)', grams: 100, calories: 160, carbs: 9, protein: 2, fat: 15, cat: 'veg_nut' },
  { id: 'v2', icon: '🥗', name: '양배추 (생것)', grams: 100, calories: 25, carbs: 6, protein: 1, fat: 0, cat: 'veg_nut' },
  { id: 'v3', icon: '🍅', name: '방울토마토', grams: 100, calories: 15, carbs: 4, protein: 1, fat: 0, cat: 'veg_nut' },
  { id: 'v4', icon: '🥦', name: '브로콜리 (데친것)', grams: 100, calories: 35, carbs: 7, protein: 2, fat: 0, cat: 'veg_nut' },
  { id: 'v5', icon: '🧅', name: '양파 (생것)', grams: 100, calories: 40, carbs: 9, protein: 1, fat: 0, cat: 'veg_nut' },
  { id: 'v6', icon: '🍄', name: '새송이버섯', grams: 100, calories: 25, carbs: 5, protein: 3, fat: 0, cat: 'veg_nut' },
  { id: 'v7', icon: '🍄', name: '팽이버섯', grams: 100, calories: 30, carbs: 5, protein: 3, fat: 0, cat: 'veg_nut' },
  { id: 'n1', icon: '🥜', name: '아몬드', grams: 30, calories: 170, carbs: 6, protein: 6, fat: 15, cat: 'veg_nut' },
  { id: 'n2', icon: '🌰', name: '호두', grams: 30, calories: 190, carbs: 4, protein: 4, fat: 19, cat: 'veg_nut' },
  { id: 'n3', icon: '🥜', name: '캐슈넛', grams: 30, calories: 160, carbs: 9, protein: 5, fat: 13, cat: 'veg_nut' },

  // 🍎 9. 과일류
  { id: 'f1', icon: '🍎', name: '사과 (중간 크기)', grams: 150, calories: 80, carbs: 21, protein: 0, fat: 0, cat: 'fruit' },
  { id: 'f2', icon: '🍌', name: '바나나 (1개)', grams: 100, calories: 90, carbs: 23, protein: 1, fat: 0, cat: 'fruit' },
  { id: 'f3', icon: '🍓', name: '딸기', grams: 100, calories: 30, carbs: 7, protein: 1, fat: 0, cat: 'fruit' },
  { id: 'f4', icon: '🫐', name: '블루베리', grams: 100, calories: 45, carbs: 11, protein: 1, fat: 0, cat: 'fruit' },
  { id: 'f5', icon: '🍊', name: '귤 (1개)', grams: 80, calories: 35, carbs: 9, protein: 0, fat: 0, cat: 'fruit' },

  // 🍿 10. 유제품 & 음료
  { id: 'd1_2', icon: '🥛', name: '일반 우유', grams: 200, calories: 130, carbs: 10, protein: 6, fat: 7, cat: 'dairy_drink' },
  { id: 'd2_2', icon: '🥛', name: '저지방 우유', grams: 200, calories: 80, carbs: 10, protein: 6, fat: 2, cat: 'dairy_drink' },
  { id: 'd3_2', icon: '🥛', name: '아몬드 브리즈 (언스위트)', grams: 190, calories: 35, carbs: 3, protein: 1, fat: 2, cat: 'dairy_drink' },
  { id: 'd4_2', icon: '🥛', name: '오트밀크 (무가당)', grams: 200, calories: 90, carbs: 14, protein: 2, fat: 3, cat: 'dairy_drink' },
  { id: 'd5_2', icon: '🧀', name: '슬라이스 치즈 (1장)', grams: 20, calories: 65, carbs: 1, protein: 4, fat: 5, cat: 'dairy_drink' },
  { id: 'd6_2', icon: '🧀', name: '모짜렐라 치즈', grams: 100, calories: 300, carbs: 2, protein: 22, fat: 22, cat: 'dairy_drink' },

  // 🍞 10.5 빵류 (Bread)
  { id: 'bd1', icon: '🥯', name: '널담 고단백 배꼽 베이글 플레인', grams: 140, calories: 391, carbs: 61, protein: 21, fat: 8, cat: 'bread' },
  { id: 'bd2', icon: '🥯', name: '달다 무설탕 통밀 베이글', grams: 110, calories: 296, carbs: 59.2, protein: 11.5, fat: 1.5, cat: 'bread' },
  { id: 'bd3', icon: '🍞', name: '널담 고단백 저당 슬랩', grams: 80, calories: 225, carbs: 39, protein: 14, fat: 1.4, cat: 'bread' },
  { id: 'bd4', icon: '🍞', name: '일반 식빵', grams: 100, calories: 266, carbs: 50.6, protein: 8.8, fat: 3.3, cat: 'bread' },
  { id: 'bd5', icon: '🍞', name: '통밀 식빵', grams: 100, calories: 259, carbs: 47.1, protein: 9.1, fat: 4.1, cat: 'bread' },
  { id: 'bd6', icon: '🥯', name: '플레인 베이글', grams: 100, calories: 254, carbs: 50, protein: 10, fat: 1.5, cat: 'bread' },
  { id: 'bd7', icon: '🥐', name: '크루아상', grams: 100, calories: 456, carbs: 46, protein: 8.6, fat: 26, cat: 'bread' },
  { id: 'bd8', icon: '🥖', name: '바게트', grams: 100, calories: 270, carbs: 56, protein: 9, fat: 1, cat: 'bread' },
  { id: 'bd9', icon: '🍞', name: '소금빵', grams: 100, calories: 330, carbs: 42, protein: 7, fat: 15, cat: 'bread' },
  { id: 'bd10', icon: '🥯', name: '모닝빵', grams: 100, calories: 290, carbs: 50, protein: 9, fat: 6, cat: 'bread' },
  { id: 'bd11', icon: '🥯', name: '단팥빵', grams: 100, calories: 300, carbs: 58, protein: 7, fat: 4, cat: 'bread' },

  // 🍔 11. 다이어트 외식 & 프랜차이즈 (소스 제외 평균치)
  { id: 'fr1', icon: '🥪', name: '서브웨이 베지 (15cm)', grams: 162, calories: 230, carbs: 39, protein: 8, fat: 3, cat: 'eating_out' },
  { id: 'fr2', icon: '🥪', name: '서브웨이 로스트 치킨 (15cm)', grams: 233, calories: 300, carbs: 42, protein: 26, fat: 5, cat: 'eating_out' },
  { id: 'fr3', icon: '🥪', name: '서브웨이 써브웨이 클럽 (15cm)', grams: 236, calories: 293, carbs: 46, protein: 20, fat: 5, cat: 'eating_out' },
  { id: 'fr4', icon: '🥪', name: '서브웨이 쉬림프 (15cm)', grams: 193, calories: 241, carbs: 41, protein: 14, fat: 2, cat: 'eating_out' },
  { id: 'fr5', icon: '🥗', name: '샐러디 콥 샐러드 (드레싱 제외)', grams: 200, calories: 220, carbs: 10, protein: 12, fat: 15, cat: 'eating_out' },
  { id: 'fr6', icon: '🥗', name: '샐러디 칠리베이컨 웜볼', grams: 250, calories: 480, carbs: 55, protein: 18, fat: 20, cat: 'eating_out' },
  { id: 'fr7', icon: '🍔', name: '맘스터치 휠렛버거', grams: 250, calories: 590, carbs: 60, protein: 35, fat: 23, cat: 'eating_out' },
  { id: 'fr8', icon: '🍔', name: '맥도날드 맥스파이시 상하이버거', grams: 230, calories: 501, carbs: 53, protein: 24, fat: 21, cat: 'eating_out' },
  { id: 'fr9', icon: '🍣', name: '연어초밥 (10pcs)', grams: 300, calories: 550, carbs: 70, protein: 35, fat: 15, cat: 'eating_out' },
  { id: 'fr10',icon: '🥙', name: '포케 (연어/참치 - 소스제외)', grams: 350, calories: 450, carbs: 50, protein: 25, fat: 16, cat: 'eating_out' },

  // 🍜 12. 기타 식사류 (외식/한식)
  { id: 'k1_1', icon: '🍲', name: '김치찌개 (건더기 위주)', grams: 400, calories: 250, carbs: 15, protein: 18, fat: 12, cat: 'etc_meal' },
  { id: 'k1_2', icon: '🥘', name: '된장찌개 (건더기 위주)', grams: 400, calories: 200, carbs: 20, protein: 15, fat: 8, cat: 'etc_meal' },
  { id: 'k1_3', icon: '🥣', name: '미역국 (소고기)', grams: 400, calories: 150, carbs: 10, protein: 12, fat: 7, cat: 'etc_meal' },
  { id: 'k1_4', icon: '🍜', name: '신라면 (국물 제외)', grams: 120, calories: 380, carbs: 60, protein: 8, fat: 12, cat: 'etc_meal' },
  { id: 'k1_5', icon: '🍜', name: '짜파게티', grams: 140, calories: 610, carbs: 83, protein: 11, fat: 26, cat: 'etc_meal' },
  { id: 'k1_6', icon: '🍱', name: '제육볶음', grams: 200, calories: 450, carbs: 20, protein: 30, fat: 25, cat: 'etc_meal' },
  { id: 'k1_7', icon: '🍲', name: '삼계탕 (국물 제외)', grams: 500, calories: 600, carbs: 20, protein: 65, fat: 25, cat: 'etc_meal' }
];

export const FOOD_PRESETS: FoodPreset[] = QUICK_FOODS.map(f => ({
  id: f.id,
  name: f.name,
  category: f.cat,
  icon: f.icon,
  baseCalories: f.calories,
  baseCarbs: f.carbs,
  baseProtein: f.protein,
  baseFat: f.fat,
  servingUnit: 'g',
  baseGrams: f.grams
}));

export const CATEGORY_LABELS: Record<string, string> = {
  snack: '🍫 간식/프로틴',
  carbs: '🌾 곡물류',
  meat: '🥩 고기류',
  seafood: '🐟 수산물',
  veg_nut: '🥗 채소/견과',
  fruit: '🍎 과일',
  dairy_drink: '🥛 유제품/음료',
  eating_out: '🍔 외식/프랜차이즈',
  etc_meal: '🍜 기타 식사',
  custom: '✨ 커스텀/직접 등록'
};
