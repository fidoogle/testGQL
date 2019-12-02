const { gql, ApolloServer } = require("apollo-server-azure-functions");
const axios = require('axios');
const { find, filter } = require('lodash');

const typeDefs = gql`
    type Uplift {
        email__c: String
        Gross_Annual_Income__c: Float
        Id: String!
        Name: String
        OwnerId: String
    }
    type Query {
        uplifts: [Uplift!]!
        upliftById(id: String!): Uplift
        searchName(query: String!): [Uplift]
        grossGreaterThan(amount: Float): [Uplift]
    }
`;

const resolvers = {
    Query: {
        uplifts: async () => await getUplifts(),
        upliftById: async (parent, args) => find(await getUplifts(), { Id: args.id }),
        searchName: async (parent, args) => filter(await getUplifts(), o => {
            return o.Name.search(new RegExp(args.query, "i"))!==-1; //case insensitive
        }),
        grossGreaterThan: async (parent, args) => filter(await getUplifts(), o => o.Gross_Annual_Income__c > args.amount)
    }
}

const server = new ApolloServer({
    typeDefs,
    resolvers,
    context: ({ request }) => {
        const token = request.headers.authorization || '';
        const user = { token: token };
        return { user };
    }
});

const getUplifts = async () => {
    if (cachedUplifts === null) {
        try {
            //Get numRecords=10 uplift records:
            const response = await axios('https://prod-23.centralus.logic.azure.com/workflows/da34061b23e2452fb8caf97eab25609d/triggers/manual/paths/invoke?numRecords=10&api-version=2016-10-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=5RHVRG0sSa1HhC81WC0g1GditgsQsI5Z2e7e4OImBTA', {
                method: 'GET',
                mode: 'no-cors',
                headers: {
                    'Access-Control-Allow-Origin': '*',
                    'Content-Type': 'application/json',
                },
                withCredentials: false,
                credentials: false,
            });
            return response.data;
        } catch (error) {
            console.log(error);
            return null;
        }
    } else {
        return cachedUplifts;
    }
}

let cachedUplifts = null;
cachedUplifts = getUplifts();

module.exports = server.createHandler({
    cors: {
        origin: '*',
        credentials: false,
    }
});