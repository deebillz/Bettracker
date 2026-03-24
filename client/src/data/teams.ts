// Pre-loaded team rosters by sport for quick matchup selection
// Teams are sorted alphabetically within each sport

export const TEAMS_BY_SPORT: Record<string, string[]> = {
  MLB: [
    "Arizona Diamondbacks",
    "Atlanta Braves",
    "Baltimore Orioles",
    "Boston Red Sox",
    "Chicago Cubs",
    "Chicago White Sox",
    "Cincinnati Reds",
    "Cleveland Guardians",
    "Colorado Rockies",
    "Detroit Tigers",
    "Houston Astros",
    "Kansas City Royals",
    "Los Angeles Angels",
    "Los Angeles Dodgers",
    "Miami Marlins",
    "Milwaukee Brewers",
    "Minnesota Twins",
    "New York Mets",
    "New York Yankees",
    "Oakland Athletics",
    "Philadelphia Phillies",
    "Pittsburgh Pirates",
    "San Diego Padres",
    "San Francisco Giants",
    "Seattle Mariners",
    "St. Louis Cardinals",
    "Tampa Bay Rays",
    "Texas Rangers",
    "Toronto Blue Jays",
    "Washington Nationals",
  ],
  NFL: [
    "Arizona Cardinals",
    "Atlanta Falcons",
    "Baltimore Ravens",
    "Buffalo Bills",
    "Carolina Panthers",
    "Chicago Bears",
    "Cincinnati Bengals",
    "Cleveland Browns",
    "Dallas Cowboys",
    "Denver Broncos",
    "Detroit Lions",
    "Green Bay Packers",
    "Houston Texans",
    "Indianapolis Colts",
    "Jacksonville Jaguars",
    "Kansas City Chiefs",
    "Las Vegas Raiders",
    "Los Angeles Chargers",
    "Los Angeles Rams",
    "Miami Dolphins",
    "Minnesota Vikings",
    "New England Patriots",
    "New Orleans Saints",
    "New York Giants",
    "New York Jets",
    "Philadelphia Eagles",
    "Pittsburgh Steelers",
    "San Francisco 49ers",
    "Seattle Seahawks",
    "Tampa Bay Buccaneers",
    "Tennessee Titans",
    "Washington Commanders",
  ],
  NBA: [
    "Atlanta Hawks",
    "Boston Celtics",
    "Brooklyn Nets",
    "Charlotte Hornets",
    "Chicago Bulls",
    "Cleveland Cavaliers",
    "Dallas Mavericks",
    "Denver Nuggets",
    "Detroit Pistons",
    "Golden State Warriors",
    "Houston Rockets",
    "Indiana Pacers",
    "LA Clippers",
    "Los Angeles Lakers",
    "Memphis Grizzlies",
    "Miami Heat",
    "Milwaukee Bucks",
    "Minnesota Timberwolves",
    "New Orleans Pelicans",
    "New York Knicks",
    "Oklahoma City Thunder",
    "Orlando Magic",
    "Philadelphia 76ers",
    "Phoenix Suns",
    "Portland Trail Blazers",
    "Sacramento Kings",
    "San Antonio Spurs",
    "Toronto Raptors",
    "Utah Jazz",
    "Washington Wizards",
  ],
  NHL: [
    "Anaheim Ducks",
    "Arizona Coyotes",
    "Boston Bruins",
    "Buffalo Sabres",
    "Calgary Flames",
    "Carolina Hurricanes",
    "Chicago Blackhawks",
    "Colorado Avalanche",
    "Columbus Blue Jackets",
    "Dallas Stars",
    "Detroit Red Wings",
    "Edmonton Oilers",
    "Florida Panthers",
    "Los Angeles Kings",
    "Minnesota Wild",
    "Montreal Canadiens",
    "Nashville Predators",
    "New Jersey Devils",
    "New York Islanders",
    "New York Rangers",
    "Ottawa Senators",
    "Philadelphia Flyers",
    "Pittsburgh Penguins",
    "San Jose Sharks",
    "Seattle Kraken",
    "St. Louis Blues",
    "Tampa Bay Lightning",
    "Toronto Maple Leafs",
    "Utah Hockey Club",
    "Vancouver Canucks",
    "Vegas Golden Knights",
    "Washington Capitals",
    "Winnipeg Jets",
  ],
  "College Football": [
    "Alabama Crimson Tide",
    "Arizona State Sun Devils",
    "Arkansas Razorbacks",
    "Auburn Tigers",
    "Boise State Broncos",
    "BYU Cougars",
    "Clemson Tigers",
    "Colorado Buffaloes",
    "Florida Gators",
    "Florida State Seminoles",
    "Georgia Bulldogs",
    "Georgia Tech Yellow Jackets",
    "Illinois Fighting Illini",
    "Indiana Hoosiers",
    "Iowa Hawkeyes",
    "Iowa State Cyclones",
    "Kansas Jayhawks",
    "Kansas State Wildcats",
    "Kentucky Wildcats",
    "LSU Tigers",
    "Louisville Cardinals",
    "Memphis Tigers",
    "Miami Hurricanes",
    "Michigan Wolverines",
    "Michigan State Spartans",
    "Minnesota Golden Gophers",
    "Missouri Tigers",
    "Nebraska Cornhuskers",
    "North Carolina Tar Heels",
    "Notre Dame Fighting Irish",
    "Ohio State Buckeyes",
    "Oklahoma Sooners",
    "Ole Miss Rebels",
    "Oregon Ducks",
    "Oregon State Beavers",
    "Penn State Nittany Lions",
    "Pittsburgh Panthers",
    "Purdue Boilermakers",
    "Rutgers Scarlet Knights",
    "SMU Mustangs",
    "South Carolina Gamecocks",
    "Syracuse Orange",
    "TCU Horned Frogs",
    "Tennessee Volunteers",
    "Texas Longhorns",
    "Texas A&M Aggies",
    "Texas Tech Red Raiders",
    "Tulane Green Wave",
    "UCLA Bruins",
    "USC Trojans",
    "Virginia Tech Hokies",
    "Wake Forest Demon Deacons",
    "Washington Huskies",
    "West Virginia Mountaineers",
    "Wisconsin Badgers",
  ],
  "College Basketball": [
    "Alabama Crimson Tide",
    "Arizona Wildcats",
    "Arkansas Razorbacks",
    "Auburn Tigers",
    "Baylor Bears",
    "BYU Cougars",
    "Clemson Tigers",
    "Colorado Buffaloes",
    "Connecticut Huskies",
    "Creighton Bluejays",
    "Duke Blue Devils",
    "Florida Gators",
    "Gonzaga Bulldogs",
    "Houston Cougars",
    "Illinois Fighting Illini",
    "Indiana Hoosiers",
    "Iowa State Cyclones",
    "Kansas Jayhawks",
    "Kentucky Wildcats",
    "Louisville Cardinals",
    "Marquette Golden Eagles",
    "Michigan State Spartans",
    "Michigan Wolverines",
    "North Carolina Tar Heels",
    "Ohio State Buckeyes",
    "Oregon Ducks",
    "Purdue Boilermakers",
    "San Diego State Aztecs",
    "St. John's Red Storm",
    "Tennessee Volunteers",
    "Texas Longhorns",
    "Texas Tech Red Raiders",
    "UCLA Bruins",
    "Villanova Wildcats",
    "Virginia Cavaliers",
    "Wisconsin Badgers",
    "Xavier Musketeers",
  ],
  Soccer: [
    "Arsenal",
    "Aston Villa",
    "Atletico Madrid",
    "Barcelona",
    "Bayern Munich",
    "Borussia Dortmund",
    "Brighton",
    "Chelsea",
    "Crystal Palace",
    "Everton",
    "Fulham",
    "Inter Milan",
    "Juventus",
    "Liverpool",
    "Manchester City",
    "Manchester United",
    "AC Milan",
    "Napoli",
    "Newcastle United",
    "Nottingham Forest",
    "Paris Saint-Germain",
    "Real Madrid",
    "Tottenham Hotspur",
    "West Ham United",
    "Wolverhampton",
    // MLS
    "Atlanta United",
    "Austin FC",
    "Charlotte FC",
    "Chicago Fire",
    "Cincinnati FC",
    "Colorado Rapids",
    "Columbus Crew",
    "D.C. United",
    "FC Dallas",
    "Houston Dynamo",
    "Inter Miami",
    "LA Galaxy",
    "LAFC",
    "Minnesota United",
    "Nashville SC",
    "New England Revolution",
    "New York City FC",
    "New York Red Bulls",
    "Orlando City",
    "Philadelphia Union",
    "Portland Timbers",
    "Real Salt Lake",
    "San Jose Earthquakes",
    "Seattle Sounders",
    "Sporting Kansas City",
    "St. Louis City SC",
    "Toronto FC",
    "Vancouver Whitecaps",
  ],
  Boxing: [
    // No fixed teams — use free text for fighter names
  ],
  MMA: [
    // No fixed teams — use free text for fighter names
  ],
  Tennis: [
    // No fixed teams — use free text for player names
  ],
  Other: [
    // Free text
  ],
};

// Sports that have team matchups vs individual matchups (fighters/players)
export const INDIVIDUAL_SPORTS = ["Boxing", "MMA", "Tennis", "Other"];

// Helper to get short team name (last word usually)
export function getShortName(fullName: string): string {
  const parts = fullName.split(" ");
  // Handle special cases
  if (fullName === "Philadelphia 76ers") return "76ers";
  if (fullName === "Portland Trail Blazers") return "Trail Blazers";
  if (fullName === "Golden State Warriors") return "Warriors";
  if (fullName === "Oklahoma City Thunder") return "Thunder";
  if (fullName === "San Antonio Spurs") return "Spurs";
  if (fullName === "San Francisco 49ers") return "49ers";
  if (fullName === "San Francisco Giants") return "Giants";
  if (fullName === "San Diego Padres") return "Padres";
  if (fullName === "San Jose Sharks") return "Sharks";
  if (fullName === "San Jose Earthquakes") return "Earthquakes";
  if (fullName === "Los Angeles Dodgers") return "Dodgers";
  if (fullName === "Los Angeles Angels") return "Angels";
  if (fullName === "Los Angeles Lakers") return "Lakers";
  if (fullName === "Los Angeles Kings") return "Kings";
  if (fullName === "Los Angeles Chargers") return "Chargers";
  if (fullName === "Los Angeles Rams") return "Rams";
  if (fullName === "Las Vegas Raiders") return "Raiders";
  if (fullName === "Vegas Golden Knights") return "Golden Knights";
  if (fullName === "Tampa Bay Rays") return "Rays";
  if (fullName === "Tampa Bay Buccaneers") return "Buccaneers";
  if (fullName === "Tampa Bay Lightning") return "Lightning";
  if (fullName === "Green Bay Packers") return "Packers";
  if (fullName === "Kansas City Chiefs") return "Chiefs";
  if (fullName === "Kansas City Royals") return "Royals";
  if (fullName === "New York Yankees") return "Yankees";
  if (fullName === "New York Mets") return "Mets";
  if (fullName === "New York Knicks") return "Knicks";
  if (fullName === "New York Jets") return "Jets";
  if (fullName === "New York Giants") return "Giants (NFL)";
  if (fullName === "New York Islanders") return "Islanders";
  if (fullName === "New York Rangers") return "Rangers (NHL)";
  if (fullName === "New York City FC") return "NYCFC";
  if (fullName === "New York Red Bulls") return "Red Bulls";
  if (fullName === "New England Patriots") return "Patriots";
  if (fullName === "New England Revolution") return "Revolution";
  if (fullName === "New Orleans Saints") return "Saints";
  if (fullName === "New Orleans Pelicans") return "Pelicans";
  if (fullName === "New Jersey Devils") return "Devils";
  if (fullName === "St. Louis Cardinals") return "Cardinals (MLB)";
  if (fullName === "St. Louis Blues") return "Blues";
  if (fullName === "St. Louis City SC") return "St. Louis City";
  if (fullName.startsWith("St. John's")) return "St. John's";
  if (fullName === "Real Salt Lake") return "RSL";
  if (fullName === "Real Madrid") return "Real Madrid";
  if (fullName === "FC Dallas") return "FC Dallas";
  if (fullName === "D.C. United") return "DC United";
  if (fullName === "AC Milan") return "AC Milan";
  if (fullName === "LA Clippers") return "Clippers";
  if (fullName === "Inter Miami") return "Inter Miami";
  if (fullName === "Inter Milan") return "Inter Milan";
  if (fullName === "Utah Hockey Club") return "Utah HC";
  // College teams — return mascot
  if (fullName.includes(" ")) return parts[parts.length - 1];
  return fullName;
}
