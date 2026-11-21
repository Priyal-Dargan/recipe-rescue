/* =========================================================
   data.js - static content used across the app
   ========================================================= */

const DIETS = [
  { id: 'none',        label: 'No preference',  emoji: '🍽️' },
  { id: 'vegetarian',  label: 'Vegetarian',     emoji: '🥗' },
  { id: 'vegan',       label: 'Vegan',          emoji: '🌱' },
  { id: 'eggetarian',  label: 'Eggetarian',     emoji: '🥚' },
  { id: 'nonveg',      label: 'Non-vegetarian', emoji: '🍗' },
  { id: 'jain',        label: 'Jain',           emoji: '🪷' }
];

const ALLERGIES = [
  { id: 'peanuts',   label: 'Peanuts',   emoji: '🥜' },
  { id: 'treenuts',  label: 'Tree nuts', emoji: '🌰' },
  { id: 'dairy',     label: 'Dairy',     emoji: '🥛' },
  { id: 'gluten',    label: 'Gluten',    emoji: '🌾' },
  { id: 'eggs',      label: 'Eggs',      emoji: '🥚' },
  { id: 'soy',       label: 'Soy',       emoji: '🫘' },
  { id: 'shellfish', label: 'Shellfish', emoji: '🦐' },
  { id: 'fish',      label: 'Fish',      emoji: '🐟' }
];

const CUISINES = [
  { id: 'indian',        label: 'Indian',        emoji: '🍛' },
  { id: 'italian',       label: 'Italian',       emoji: '🍝' },
  { id: 'chinese',       label: 'Chinese',       emoji: '🥡' },
  { id: 'mexican',       label: 'Mexican',       emoji: '🌮' },
  { id: 'mediterranean', label: 'Mediterranean', emoji: '🫒' },
  { id: 'thai',          label: 'Thai',          emoji: '🍜' },
  { id: 'continental',   label: 'Continental',   emoji: '🥘' },
  { id: 'american',      label: 'American',      emoji: '🍔' }
];

/* Pantry bins (used from Stage 2) */
const CATEGORIES = [
  { id: 'veggies',  label: 'Veggies',  emoji: '🥦' },
  { id: 'fruits',   label: 'Fruits',   emoji: '🍎' },
  { id: 'dairy',    label: 'Dairy',    emoji: '🧀' },
  { id: 'grains',   label: 'Grains',   emoji: '🌾' },
  { id: 'proteins', label: 'Proteins', emoji: '🍗' },
  { id: 'spices',   label: 'Spices',   emoji: '🧂' },
  { id: 'other',    label: 'Other',    emoji: '🥫' }
];

/* Ingredient catalog. shelf = typical shelf life in days (for auto expiry dates) */
const INGREDIENTS = [
  { name: 'Tomato',        emoji: '🍅', cat: 'veggies',  shelf: 6 },
  { name: 'Onion',         emoji: '🧅', cat: 'veggies',  shelf: 30 },
  { name: 'Potato',        emoji: '🥔', cat: 'veggies',  shelf: 30 },
  { name: 'Carrot',        emoji: '🥕', cat: 'veggies',  shelf: 14 },
  { name: 'Garlic',        emoji: '🧄', cat: 'veggies',  shelf: 60 },
  { name: 'Spinach',       emoji: '🥬', cat: 'veggies',  shelf: 4 },
  { name: 'Capsicum',      emoji: '🫑', cat: 'veggies',  shelf: 7 },
  { name: 'Green Chilli',  emoji: '🌶️', cat: 'veggies',  shelf: 10 },
  { name: 'Broccoli',      emoji: '🥦', cat: 'veggies',  shelf: 5 },
  { name: 'Cucumber',      emoji: '🥒', cat: 'veggies',  shelf: 7 },
  { name: 'Mushroom',      emoji: '🍄', cat: 'veggies',  shelf: 5 },
  { name: 'Corn',          emoji: '🌽', cat: 'veggies',  shelf: 5 },
  { name: 'Eggplant',      emoji: '🍆', cat: 'veggies',  shelf: 7 },
  { name: 'Cauliflower',   emoji: '🥦', cat: 'veggies',  shelf: 7 },
  { name: 'Peas',          emoji: '🫛', cat: 'veggies',  shelf: 5 },
  { name: 'Lemon',         emoji: '🍋', cat: 'fruits',   shelf: 14 },
  { name: 'Banana',        emoji: '🍌', cat: 'fruits',   shelf: 5 },
  { name: 'Apple',         emoji: '🍎', cat: 'fruits',   shelf: 21 },
  { name: 'Avocado',       emoji: '🥑', cat: 'fruits',   shelf: 4 },
  { name: 'Milk',          emoji: '🥛', cat: 'dairy',    shelf: 5 },
  { name: 'Curd',          emoji: '🥣', cat: 'dairy',    shelf: 7 },
  { name: 'Paneer',        emoji: '🧀', cat: 'dairy',    shelf: 6 },
  { name: 'Cheese',        emoji: '🧀', cat: 'dairy',    shelf: 20 },
  { name: 'Butter',        emoji: '🧈', cat: 'dairy',    shelf: 30 },
  { name: 'Egg',           emoji: '🥚', cat: 'proteins', shelf: 21 },
  { name: 'Chicken',       emoji: '🍗', cat: 'proteins', shelf: 2 },
  { name: 'Fish',          emoji: '🐟', cat: 'proteins', shelf: 2 },
  { name: 'Lentils (Dal)', emoji: '🫘', cat: 'proteins', shelf: 365 },
  { name: 'Chickpeas',     emoji: '🫘', cat: 'proteins', shelf: 365 },
  { name: 'Rice',          emoji: '🍚', cat: 'grains',   shelf: 365 },
  { name: 'Bread',         emoji: '🍞', cat: 'grains',   shelf: 4 },
  { name: 'Pasta',         emoji: '🍝', cat: 'grains',   shelf: 365 },
  { name: 'Wheat Flour',   emoji: '🌾', cat: 'grains',   shelf: 180 },
  { name: 'Salt',          emoji: '🧂', cat: 'spices',   shelf: 999 },
  { name: 'Turmeric',      emoji: '🟡', cat: 'spices',   shelf: 365 },
  { name: 'Cumin',         emoji: '🌿', cat: 'spices',   shelf: 365 },
  { name: 'Garam Masala',  emoji: '🌶️', cat: 'spices',   shelf: 365 },
  { name: 'Black Pepper',  emoji: '⚫', cat: 'spices',   shelf: 365 },
  { name: 'Ginger',        emoji: '🫚', cat: 'spices',   shelf: 21 },
  { name: 'Olive Oil',     emoji: '🫒', cat: 'other',    shelf: 365 },
  { name: 'Soy Sauce',     emoji: '🍶', cat: 'other',    shelf: 365 }
];

/* =========================================================
   STAGE 4 - built-in recipes (work without AI or internet)
   ing: [name, qty, unit]   steps: [text, timerMinutes (0 = no timer)]
   Use the catalog names above so matching works.
   ========================================================= */
const RECIPES = [
  { id: 'palak-paneer', t: 'Palak Paneer', e: '🥬', c: 'indian', time: 30, d: 'Easy', serves: 2,
    blurb: 'Creamy spinach curry with soft paneer. Perfect for spinach that is about to wilt.',
    ing: [['Spinach', 250, 'g'], ['Paneer', 200, 'g'], ['Onion', 1, 'pcs'], ['Tomato', 2, 'pcs'], ['Garlic', 3, 'cloves'], ['Butter', 1, 'tbsp'], ['Cumin', 1, 'tsp'], ['Garam Masala', 1, 'tsp'], ['Salt', 1, 'tsp']],
    steps: [['Boil the spinach for 2 minutes, drain, then blend into a smooth puree.', 3], ['Heat the butter in a pan. Add cumin, then fry the chopped onion and garlic until golden.', 6], ['Add the chopped tomatoes and cook until soft and mushy.', 5], ['Stir in the spinach puree, salt and garam masala. Simmer gently.', 5], ['Add the paneer cubes and cook until heated through. Serve hot with rice or roti.', 3]] },

  { id: 'egg-bhurji', t: 'Egg Bhurji', e: '🍳', c: 'indian', time: 15, d: 'Easy', serves: 2,
    blurb: 'Spiced Indian scrambled eggs. Ready in minutes and great with bread.',
    ing: [['Egg', 4, 'pcs'], ['Onion', 1, 'pcs'], ['Tomato', 1, 'pcs'], ['Green Chilli', 1, 'pcs'], ['Butter', 1, 'tbsp'], ['Turmeric', 0.5, 'tsp'], ['Salt', 1, 'tsp']],
    steps: [['Melt the butter and fry the chopped onion and green chilli until soft.', 3], ['Add the tomato and turmeric. Cook until the tomato softens.', 3], ['Beat the eggs with salt, pour them in and stir gently until softly set.', 3], ['Serve straight away with toast or roti.', 0]] },

  { id: 'aloo-gobi', t: 'Aloo Gobi', e: '🥔', c: 'indian', time: 35, d: 'Easy', serves: 3,
    blurb: 'Dry potato and cauliflower curry, a weeknight classic.',
    ing: [['Potato', 2, 'pcs'], ['Cauliflower', 1, 'pcs'], ['Onion', 1, 'pcs'], ['Tomato', 1, 'pcs'], ['Ginger', 1, 'tsp'], ['Turmeric', 0.5, 'tsp'], ['Cumin', 1, 'tsp'], ['Garam Masala', 1, 'tsp'], ['Salt', 1, 'tsp'], ['Olive Oil', 2, 'tbsp']],
    steps: [['Cut the potatoes and cauliflower into bite-size pieces.', 0], ['Heat oil, add cumin, then the onion and ginger. Fry until golden.', 5], ['Add the tomato, turmeric and salt. Cook until soft.', 4], ['Add the potatoes and cauliflower, cover and cook on low heat, stirring now and then.', 20], ['Sprinkle garam masala, mix and serve.', 0]] },

  { id: 'dal-tadka', t: 'Dal Tadka', e: '🍲', c: 'indian', time: 35, d: 'Easy', serves: 3,
    blurb: 'Comforting lentils finished with a sizzling garlic and cumin tempering.',
    ing: [['Lentils (Dal)', 150, 'g'], ['Tomato', 1, 'pcs'], ['Onion', 1, 'pcs'], ['Garlic', 4, 'cloves'], ['Green Chilli', 1, 'pcs'], ['Butter', 1, 'tbsp'], ['Cumin', 1, 'tsp'], ['Turmeric', 0.5, 'tsp'], ['Salt', 1, 'tsp']],
    steps: [['Wash the dal. Boil with turmeric, salt and 3 cups of water until soft and mushy.', 20], ['Meanwhile, chop the onion, tomato, garlic and chilli.', 0], ['Heat butter, add cumin, garlic, onion and chilli. Fry until golden, then add the tomato.', 6], ['Pour this tadka over the cooked dal, mix well and simmer.', 4], ['Serve hot with rice.', 0]] },

  { id: 'chana-masala', t: 'Chana Masala', e: '🫘', c: 'indian', time: 40, d: 'Medium', serves: 3,
    blurb: 'Spicy, tangy chickpea curry. Fully vegan and very filling.',
    ing: [['Chickpeas', 250, 'g'], ['Onion', 2, 'pcs'], ['Tomato', 2, 'pcs'], ['Garlic', 3, 'cloves'], ['Ginger', 1, 'tbsp'], ['Lemon', 0.5, 'pcs'], ['Garam Masala', 1.5, 'tsp'], ['Turmeric', 0.5, 'tsp'], ['Salt', 1, 'tsp'], ['Olive Oil', 2, 'tbsp']],
    steps: [['Boil the chickpeas until soft (or use pre-cooked ones).', 15], ['Fry the chopped onion, garlic and ginger until deep golden.', 8], ['Add the tomatoes, turmeric, garam masala and salt. Cook into a thick masala.', 6], ['Add the chickpeas with a cup of water and simmer so the flavours soak in.', 8], ['Finish with a squeeze of lemon and serve.', 0]] },

  { id: 'veg-fried-rice', t: 'Veg Fried Rice', e: '🍚', c: 'chinese', time: 20, d: 'Easy', serves: 2,
    blurb: 'Turn leftover rice and a few veggies into a quick takeaway-style dinner.',
    ing: [['Rice', 250, 'g'], ['Carrot', 1, 'pcs'], ['Capsicum', 1, 'pcs'], ['Peas', 100, 'g'], ['Garlic', 3, 'cloves'], ['Soy Sauce', 2, 'tbsp'], ['Black Pepper', 0.5, 'tsp'], ['Olive Oil', 1, 'tbsp']],
    steps: [['Cook the rice, spread it on a plate and let it cool so the grains stay separate.', 10], ['Heat oil on high. Fry the garlic for 30 seconds, then add the chopped vegetables.', 4], ['Toss the veggies on high heat until crisp-tender.', 3], ['Add the rice, soy sauce and pepper. Toss until everything is hot and evenly coated.', 3]] },

  { id: 'garlic-butter-pasta', t: 'Garlic Butter Spinach Pasta', e: '🍝', c: 'italian', time: 20, d: 'Easy', serves: 2,
    blurb: 'Silky garlic butter pasta with wilted spinach and a cheesy finish.',
    ing: [['Pasta', 200, 'g'], ['Spinach', 100, 'g'], ['Garlic', 4, 'cloves'], ['Butter', 2, 'tbsp'], ['Cheese', 40, 'g'], ['Black Pepper', 0.5, 'tsp'], ['Salt', 1, 'tsp']],
    steps: [['Boil the pasta in salted water until al dente. Save a cup of the pasta water.', 10], ['Melt the butter and fry the sliced garlic until fragrant.', 2], ['Add the spinach and cook until it wilts.', 2], ['Toss in the pasta with a splash of pasta water, the grated cheese and pepper.', 2]] },

  { id: 'mushroom-pasta', t: 'Creamy Mushroom Pasta', e: '🍄', c: 'italian', time: 25, d: 'Easy', serves: 2,
    blurb: 'Mushrooms and milk make a quick, creamy sauce without any cream.',
    ing: [['Pasta', 200, 'g'], ['Mushroom', 200, 'g'], ['Milk', 200, 'ml'], ['Garlic', 3, 'cloves'], ['Cheese', 50, 'g'], ['Butter', 1, 'tbsp'], ['Black Pepper', 0.5, 'tsp'], ['Salt', 1, 'tsp']],
    steps: [['Boil the pasta in salted water until al dente, then drain.', 10], ['Fry the sliced mushrooms in butter until browned.', 5], ['Add the garlic, then pour in the milk and simmer until slightly thickened.', 4], ['Melt in the cheese, add pepper and toss with the pasta.', 2]] },

  { id: 'cheese-omelette', t: 'Cheese Omelette', e: '🧀', c: 'continental', time: 10, d: 'Easy', serves: 1,
    blurb: 'A fluffy, melty omelette for a fast breakfast or late-night snack.',
    ing: [['Egg', 3, 'pcs'], ['Cheese', 30, 'g'], ['Onion', 0.5, 'pcs'], ['Tomato', 0.5, 'pcs'], ['Butter', 1, 'tsp'], ['Black Pepper', 0.25, 'tsp'], ['Salt', 0.5, 'tsp']],
    steps: [['Beat the eggs with salt and pepper. Chop the onion and tomato finely.', 0], ['Melt the butter, then cook the onion and tomato for a minute.', 1], ['Pour in the eggs and cook until the edges set.', 2], ['Sprinkle the cheese, fold the omelette in half and serve.', 1]] },

  { id: 'chicken-curry', t: 'Home-style Chicken Curry', e: '🍗', c: 'indian', time: 45, d: 'Medium', serves: 3,
    blurb: 'A rich, everyday curry. Great for using chicken before it expires.',
    ing: [['Chicken', 500, 'g'], ['Onion', 2, 'pcs'], ['Tomato', 2, 'pcs'], ['Garlic', 4, 'cloves'], ['Ginger', 1, 'tbsp'], ['Curd', 3, 'tbsp'], ['Turmeric', 0.5, 'tsp'], ['Garam Masala', 1.5, 'tsp'], ['Salt', 1, 'tsp'], ['Olive Oil', 2, 'tbsp']],
    steps: [['Marinate the chicken with curd, turmeric and salt.', 10], ['Fry the sliced onions in oil until deep golden. Add the garlic and ginger.', 8], ['Add the tomatoes and cook until the oil separates.', 6], ['Add the chicken and cook on medium heat, stirring occasionally.', 10], ['Add half a cup of water, cover and simmer until the chicken is tender.', 10], ['Stir in the garam masala and serve hot.', 0]] },

  { id: 'paneer-bhurji', t: 'Paneer Bhurji', e: '🧀', c: 'indian', time: 15, d: 'Easy', serves: 2,
    blurb: 'Crumbled spiced paneer with onion, tomato and capsicum. Ready in 15 minutes.',
    ing: [['Paneer', 200, 'g'], ['Onion', 1, 'pcs'], ['Tomato', 1, 'pcs'], ['Capsicum', 1, 'pcs'], ['Green Chilli', 1, 'pcs'], ['Butter', 1, 'tbsp'], ['Turmeric', 0.5, 'tsp'], ['Salt', 0.5, 'tsp']],
    steps: [['Crumble the paneer with your hands.', 0], ['Melt the butter and fry the onion, chilli and capsicum until soft.', 4], ['Add the tomato, turmeric and salt. Cook until the tomato breaks down.', 3], ['Add the paneer, mix well and cook until heated through.', 3]] },

  { id: 'aloo-paratha', t: 'Aloo Paratha', e: '🫓', c: 'indian', time: 40, d: 'Medium', serves: 3,
    blurb: 'Stuffed flatbread with spiced mashed potato. Pure comfort food.',
    ing: [['Wheat Flour', 250, 'g'], ['Potato', 3, 'pcs'], ['Green Chilli', 1, 'pcs'], ['Cumin', 1, 'tsp'], ['Butter', 2, 'tbsp'], ['Salt', 1, 'tsp']],
    steps: [['Knead the flour with water and a pinch of salt into a soft dough. Rest it.', 15], ['Boil the potatoes, peel and mash with chilli, cumin and salt.', 15], ['Roll a ball of dough, add a spoon of filling, seal and roll out gently.', 0], ['Cook on a hot pan with butter until golden brown on both sides.', 3], ['Serve hot with curd or pickle.', 0]] },

  { id: 'cucumber-raita', t: 'Cucumber Raita', e: '🥒', c: 'indian', time: 5, d: 'Easy', serves: 2,
    blurb: 'Cool, refreshing yogurt side that tames any spicy meal.',
    ing: [['Curd', 300, 'g'], ['Cucumber', 1, 'pcs'], ['Tomato', 1, 'pcs'], ['Cumin', 0.5, 'tsp'], ['Salt', 0.5, 'tsp']],
    steps: [['Whisk the curd until smooth.', 0], ['Grate or finely chop the cucumber and tomato, then fold them in.', 0], ['Season with salt and roasted cumin. Chill before serving.', 0]] },

  { id: 'banana-pancakes', t: 'Banana Pancakes', e: '🥞', c: 'american', time: 20, d: 'Easy', serves: 2,
    blurb: 'A great home for overripe bananas. Soft, fluffy and naturally sweet.',
    ing: [['Banana', 2, 'pcs'], ['Egg', 2, 'pcs'], ['Wheat Flour', 100, 'g'], ['Milk', 100, 'ml'], ['Butter', 1, 'tbsp']],
    steps: [['Mash the bananas until almost smooth.', 0], ['Whisk in the eggs and milk, then fold in the flour. Do not overmix.', 0], ['Melt a little butter in a pan and pour in small rounds of batter.', 0], ['Cook until bubbles appear, flip and cook the other side until golden.', 3], ['Stack and serve warm.', 0]] },

  { id: 'tomato-soup', t: 'Roasted Tomato Soup', e: '🍅', c: 'continental', time: 30, d: 'Easy', serves: 3,
    blurb: 'Silky tomato soup with garlic croutons. Rescues soft tomatoes and stale bread.',
    ing: [['Tomato', 6, 'pcs'], ['Onion', 1, 'pcs'], ['Garlic', 2, 'cloves'], ['Butter', 1, 'tbsp'], ['Bread', 2, 'slices'], ['Black Pepper', 0.5, 'tsp'], ['Salt', 1, 'tsp']],
    steps: [['Chop the tomatoes, onion and garlic roughly.', 0], ['Melt the butter and cook the onion and garlic until soft.', 4], ['Add the tomatoes with salt and 1 cup of water. Simmer until very soft.', 15], ['Blend until smooth, then season with pepper.', 2], ['Toast cubes of bread in a dry pan for croutons and sprinkle on top.', 3]] },

  { id: 'cheese-chilli-toast', t: 'Cheese Chilli Toast', e: '🍞', c: 'continental', time: 10, d: 'Easy', serves: 2,
    blurb: 'Crispy, cheesy toast. A quick fix for bread that is nearly past its best.',
    ing: [['Bread', 4, 'slices'], ['Cheese', 60, 'g'], ['Green Chilli', 1, 'pcs'], ['Capsicum', 0.5, 'pcs'], ['Butter', 1, 'tbsp']],
    steps: [['Finely chop the chilli and capsicum and mix with the grated cheese.', 0], ['Butter one side of each slice and spread the cheese mix on the other.', 0], ['Toast on a pan or in an oven until the cheese melts and the bread is crisp.', 5]] }
];

/* Ingredient swaps: [replacement, how to use it] */
const SUBSTITUTES = {
  'Paneer': [['Tofu', 'same weight'], ['Cheese', 'cubed, adds saltiness']],
  'Curd': [['Milk', 'add 1 tsp lemon juice, rest 10 min']],
  'Milk': [['Curd', 'thin with water 1:1']],
  'Butter': [['Olive Oil', 'use about ¾ the amount']],
  'Cheese': [['Paneer', 'grated'], ['Butter', 'for richness']],
  'Egg': [['Paneer', 'crumbled, for savoury dishes'], ['Banana', '½ mashed per egg, for sweet batter']],
  'Onion': [['Spring onion', 'same amount']],
  'Tomato': [['Lemon', 'a squeeze adds tang'], ['Curd', 'for gravies']],
  'Spinach': [['Peas', 'blended'], ['Broccoli', 'chopped fine']],
  'Capsicum': [['Carrot', 'diced'], ['Broccoli', 'small florets']],
  'Chicken': [['Paneer', 'same weight'], ['Mushroom', 'hearty swap'], ['Chickpeas', 'vegetarian swap']],
  'Chickpeas': [['Lentils (Dal)', 'boiled'], ['Peas', 'cooks faster']],
  'Lentils (Dal)': [['Chickpeas', 'boiled']],
  'Rice': [['Pasta', 'boiled']],
  'Pasta': [['Rice', 'as the base']],
  'Wheat Flour': [['Bread', 'toasted, as a side']],
  'Garlic': [['Ginger', 'milder, use less']],
  'Ginger': [['Garlic', 'use a smaller amount']],
  'Green Chilli': [['Black Pepper', 'a generous pinch']],
  'Lemon': [['Tomato', 'for tang']],
  'Potato': [['Cauliflower', 'lighter'], ['Carrot', 'sweeter']],
  'Cauliflower': [['Potato', 'heavier'], ['Broccoli', 'similar bite']],
  'Peas': [['Corn', 'sweeter'], ['Carrot', 'diced']],
  'Mushroom': [['Paneer', 'cubed'], ['Eggplant', 'cubed']],
  'Carrot': [['Capsicum', 'diced']],
  'Banana': [['Apple', 'grated']],
  'Cucumber': [['Tomato', 'diced']],
  'Soy Sauce': [['Salt', 'plus a squeeze of lemon']],
  'Garam Masala': [['Cumin', 'plus a pinch of pepper']],
  'Turmeric': [['Skip it', 'it mainly adds colour']],
  'Cumin': [['Black Pepper', 'a pinch']],
  'Bread': [['Wheat Flour', 'make flatbread']],
  'Broccoli': [['Cauliflower', 'same method']]
};

/* =========================================================
   STAGE 7 - NUTRITION (estimates)
   NUTRI: name -> [kcal, protein g, carbs g, fat g] per 100 g
   Grains, pasta, dal and chickpeas are DRY weight; meat is raw.
   ========================================================= */
const NUTRI = {
  'Tomato': [18, 0.9, 3.9, 0.2], 'Onion': [40, 1.1, 9.3, 0.1], 'Potato': [77, 2, 17, 0.1],
  'Carrot': [41, 0.9, 9.6, 0.2], 'Garlic': [149, 6.4, 33, 0.5], 'Spinach': [23, 2.9, 3.6, 0.4],
  'Capsicum': [31, 1, 6, 0.3], 'Green Chilli': [40, 2, 9, 0.2], 'Broccoli': [34, 2.8, 7, 0.4],
  'Cucumber': [15, 0.7, 3.6, 0.1], 'Mushroom': [22, 3.1, 3.3, 0.3], 'Corn': [86, 3.3, 19, 1.4],
  'Eggplant': [25, 1, 6, 0.2], 'Cauliflower': [25, 1.9, 5, 0.3], 'Peas': [81, 5.4, 14, 0.4],
  'Lemon': [29, 1.1, 9.3, 0.3], 'Banana': [89, 1.1, 23, 0.3], 'Apple': [52, 0.3, 14, 0.2],
  'Avocado': [160, 2, 9, 15],
  'Milk': [61, 3.2, 4.8, 3.3], 'Curd': [61, 3.5, 4.7, 3.3], 'Paneer': [296, 18, 3.4, 22],
  'Cheese': [350, 23, 2, 28], 'Butter': [717, 0.9, 0.1, 81],
  'Egg': [143, 12.6, 0.7, 9.5], 'Chicken': [150, 20, 0, 8], 'Fish': [120, 20, 0, 4],
  'Lentils (Dal)': [350, 25, 60, 1.1], 'Chickpeas': [364, 19, 61, 6],
  'Rice': [360, 7, 79, 0.6], 'Cooked Rice': [130, 2.7, 28, 0.3], 'Bread': [265, 9, 49, 3.2],
  'Pasta': [371, 13, 75, 1.5], 'Wheat Flour': [340, 12, 72, 1.5],
  'Salt': [0, 0, 0, 0], 'Water': [0, 0, 0, 0], 'Turmeric': [312, 9.7, 67, 3.3], 'Cumin': [375, 18, 44, 22],
  'Garam Masala': [379, 15, 50, 15], 'Black Pepper': [251, 10, 64, 3.3], 'Ginger': [80, 1.8, 18, 0.8],
  'Olive Oil': [884, 0, 0, 100], 'Oil': [884, 0, 0, 100], 'Cooking Oil': [884, 0, 0, 100], 'Vegetable Oil': [884, 0, 0, 100],
  'Soy Sauce': [53, 8, 5, 0.1],
  /* extras the AI might use */
  'Tofu': [76, 8, 1.9, 4.8], 'Noodles': [370, 12, 72, 3], 'Spring Onion': [32, 1.8, 7.3, 0.2],
  'Sugar': [387, 0, 100, 0], 'Honey': [304, 0.3, 82, 0], 'Cream': [340, 2, 3, 36], 'Ghee': [900, 0, 0, 100],
  'Coriander': [23, 2.1, 3.7, 0.5], 'Yogurt': [61, 3.5, 4.7, 3.3]
};

/* weight of one piece, in grams (anything not listed counts as 100 g) */
const PIECE_G = {
  'Tomato': 120, 'Onion': 110, 'Potato': 150, 'Carrot': 70, 'Garlic': 40, 'Spinach': 100, 'Capsicum': 120,
  'Green Chilli': 10, 'Broccoli': 300, 'Cucumber': 200, 'Mushroom': 20, 'Corn': 150, 'Eggplant': 250,
  'Cauliflower': 600, 'Peas': 100, 'Lemon': 60, 'Banana': 120, 'Apple': 180, 'Avocado': 150, 'Egg': 50,
  'Chicken': 150, 'Fish': 150, 'Bread': 30, 'Cheese': 25, 'Butter': 10, 'Spring Onion': 15
};

/* grams per unit (pieces are looked up in PIECE_G instead) */
const UNIT_TO_G = { g: 1, gm: 1, kg: 1000, ml: 1, l: 1000, tsp: 4, tbsp: 14, cup: 200, clove: 4, cloves: 4, slice: 30, slices: 30, pack: 200, packs: 200 };