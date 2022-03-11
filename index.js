#!/usr/bin/env node
const fs = require("fs");
const fetch = require("node-fetch");
const { GraphQLClient } = require("graphql-request");

const Mode = Object.freeze({
  NAMES_ONLY: Symbol("NAMES_ONLY"),
  TWITTER_OR_NAME: Symbol("TWITTER_OR_NAME"),
  NAME_AND_TWITTER: Symbol("NAME_AND_TWITTER"),
});

const STANDINGS_QUERY = `
query StandingsQuery($slug: String) {
  tournament(slug: $slug){
    name
    slug
    events {
      id
      name
      slug
      numEntrants
      standings(query: {
        page: 1
        perPage: 8
        sortBy: "standing"
      }){
        nodes{
          standing
          entrant{
            name
            participants {
              user {
                authorizations(types: [TWITTER]) {
                  externalUsername
                }
              }
            }
          }
        }
      }
    }
  }
}
`;

const ENDPOINT = "https://api.smash.gg/gql/alpha";
const TOKEN = fs.readFileSync("SMASHGG_TOKEN", "utf8").trim();
const SLUG = process.argv[2];

async function main() {
  const graphQLClient = new GraphQLClient(ENDPOINT, {
    headers: { authorization: `Bearer ${TOKEN}` },
  });
  const tournamentData = await graphQLClient.request(STANDINGS_QUERY, {
    slug: SLUG,
  });

  const t = tournamentData.tournament;
  const messages = [];
  for (const e of t.events) {
    const numPlacings = e.numEntrants > 7 ? 8 : 3;
    // TODO(Adrian): Try different modes until it fits in a tweet
    const mode = numPlacings > 4 ? Mode.TWITTER_OR_NAME : Mode.NAME_AND_TWITTER;
    const intro = `${t.name} - ${e.name} top ${numPlacings}/${e.numEntrants}`;
    let placings = e.standings.nodes
      .slice(0, numPlacings)
      .map(placingString.bind(this, mode));
    messages.push(`\
${intro}

${placings.join("\n")}

📃 https://smash.gg/${e.slug.replace("/event/", "/events/")}/standings

🎞 https://www.youtube.com/watch?v=_&list=_&index=1`);
  }
  console.log(messages.join("\n---------\n"));
}

function placingString(nameMode, standing) {
  const name = standing.entrant.name;
  const twitter = standing.entrant.participants
    .map((p) => p.user)
    .filter((t) => t != null)
    .map((user) => user.authorizations)
    .filter((t) => t != null)
    .filter((authorizations) => authorizations[0] != null)
    .map((authorizations) => authorizations[0].externalUsername)
    .map((t) => "@" + t)
    .join(", ");
  const placing = ordinal(standing.standing);

  let nameString;
  switch (nameMode) {
    case Mode.NAMES_ONLY:
      nameString = name;
      break;
    case Mode.TWITTER_OR_NAME:
      nameString = twitter ? `${twitter}` : name;
      break;
    case Mode.NAME_AND_TWITTER:
      nameString = `${name}${twitter ? ` (${twitter})` : ""}`;
      break;
  }
  return `${placing} ${nameString}`;
}

function ordinal(i) {
  // Return i as a string, but with the correct ordinal indicator with suffix. Unless it's 1, 2, or 3, then return the Medal emoji.
  if (i === 1) return "🥇";
  if (i === 2) return "🥈";
  if (i === 3) return "🥉";
  return i + "th";
}

/*function ordinal(i) {
  const abs = Math.abs(i);
  const rem = abs % 10;
  const isTeen = Math.floor(abs % 100 / 10) == 1;

  let suffix = 'th';
  if (!isTeen) {
    switch (rem) {
      case 1:
        suffix = 'st';
        break;
      case 2:
        suffix = 'nd';
        break;
      case 3:
        suffix = 'rd';
        break;
    }
  }
  return i + suffix;
}*/

main().catch((error) => console.error(error));
