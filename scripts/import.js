var axios = require("axios");
var path = require("path");
var fs = require("fs");
const { exit } = require("process");

const lorcaniaBaseUrl = "https://lorcania.com/api/cardsSearch";

const allSets = [
  {
    apiSetName: "1",
    englishSetName: "The First Chapter",
  },
  {
    apiSetName: "2",
    englishSetName: "Rise of the Floodborn",
    missingLorcanitoImages: true,
  },
  {
    apiSetName: "3",
    englishSetName: "Into the Inklands",
    missingLorcanitoImages: true,
  },
  {
    apiSetName: "4",
    englishSetName: "Ursula's Return",
    missingLorcanitoImages: true,
  },
];

const cardOverrides = {
  823: {
    title: "Empowered Sibling",
  },
  824: {
    name: "Glean",
  },
};

const axiosCache = {};

const DEFAULT_SEARCH_PAYLOAD = {
  colors: [],
  sets: [],
  traits: [],
  keywords: [],
  costs: [],
  inkwell: [],
  rarity: [],
  language: "English",
  options: [],
  sorting: "collection",
};

const axiosGet = async (url, options) => {
  if (!!axiosCache[url]) {
    return axiosCache[url];
  }

  const response = await axios.get(url, options).catch((e) => {
    errored = true;
    console.log("got an axios error for url " + url + ": " + e.message);
    exit(-1);
  });

  axiosCache[url] = response;

  return response;
};

const axiosPost = async (url, setName) => {
  const payload = {
    ...DEFAULT_SEARCH_PAYLOAD,
    sets: [setName],
  };

  const response = await axios
    .post(url, payload, { headers: { "Content-Type": "application/json" } })
    .catch((e) => {
      errored = true;
      console.log("got an axios error for url " + url + ": " + e.message);
      exit(-1);
    });

  return response.data;
};

const DRY_RUN = false;

const doImport = async () => {
  const rootDir = path.join(__dirname, "..");
  const setsDir = path.join(__dirname, "..", "sets");

  if (!fs.existsSync(setsDir)) {
    throw new Error("sets directory missing");
  }

  console.log("*********SETS***********");

  // First, store all packs for later use
  for (let [index, set] of allSets.entries()) {
    console.log(
      `Working with set ${set.englishSetName} (${index + 1} of ${
        allSets.length
      })`
    );

    const response = await axiosPost(lorcaniaBaseUrl, set.apiSetName);

    // go through and set primary and fallback image urls
    // TODO: Probably going to need to map the set number here somehow
    const cards = response.cards.map((c) => {
      const frontImage = set.missingLorcanitoImages
        ? c.image
        : `https://lorcanito.imgix.net/images/cards/EN/001/${(
            "000" + c.number
          ).substr(-3)}.webp?w=300`;

      //Remove the pricing information because it changes all the time
      delete c.prices;

      const overrides = cardOverrides[c.id] ?? {};

      return {
        ...c,
        ...overrides,
        FrontImage: frontImage,
        FrontImageAlt: c.image,
        BackImage: `https://lorcanito.imgix.net/images/tts/card/card-back.png?w=300`,
      };
    });

    fs.writeFileSync(
      path.join(setsDir, set.englishSetName + ".json"),
      JSON.stringify(cards, null, 4)
    );
  }

  //   for (let [index, pack] of hobSets.data.entries()) {
  //     console.log(
  //       `Working with pack ${pack.Name} (${index + 1} of ${hobSets.data.length})`
  //     );
  //     if (index < LAST_PACK_COMPLETED) {
  //       console.log("Skipping..");
  //       continue;
  //     }

  //     // get all the player cards for the pack
  //     if (!DRY_RUN) {
  //       const cardsUrl = `${hallOfBeorn}?CardSet=${encodeURIComponent(
  //         pack.Name
  //       )}&CardType=Player`;
  //       console.log("\tgetting the cards...");
  //       const cards = await axios
  //         .get(cardsUrl, {
  //           headers: { Cookie: hob_cookies },
  //         })
  //         .catch((e) => {
  //           console.log("got an axios error" + ": " + e.message);
  //         });
  //       console.log("\tgot all cards. Saving json...");
  //       pack.cards = cards.data instanceof Array ? cards.data : [];
  //       fs.writeFileSync(
  //         path.join(packDir, pack.Name + ".json"),
  //         JSON.stringify(pack, null, 4)
  //       );
  //       console.log("\tSaved json.");
  //     }
  //   }

  console.log("*********** SETS COMPLETE *****");
};

try {
  doImport();
} catch (e) {
  console.log(`ERROR`);
}
