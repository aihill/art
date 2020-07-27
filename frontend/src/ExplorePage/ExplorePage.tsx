// import '../main.scss';
import { mergeStyles, Separator, Stack, Text } from 'office-ui-fabric-react';
import React from 'react';
import { HideAt, ShowAt } from 'react-with-breakpoints';
import { logEvent } from '../Shared/AppInsights';
import { ArtObject, ArtMatch, loadingMatch, loadingArtwork, urlEncodeArt } from "../Shared/ArtSchemas";
import bannerImage from "../images/banner5.jpg";
import {defaultArtworks, idToArtwork } from './DefaultArtwork';
import ListCarousel from './ListCarousel';
import Options from './Options';
import QueryArtwork from './QueryArtwork';
import ResultArtwork from './ResultArtwork';
import SubmitControl from './SubmitControl';
import { nMatches } from '../Shared/SearchTools';
import { lookupWithMatches, lookup, cultures, media } from '../Shared/SearchTools'
import NavBar from '../Shared/NavBar';

interface IProps {
    match: any
};

interface IState {
    queryArtwork: ArtObject,
    chosenArtwork: ArtObject,
    imageDataURI: string | null,
    cultureItems: ArtMatch[],
    mediumItems: ArtMatch[],
    cultureFilter: string,
    mediumFilter: string,
    shareLink: string | null,
}

const halfStack = mergeStyles({
    width: "50%",
    height: "100%"
})

const startingCultures = ["american", "asian", "ancient_asian", "greek", "italian", "african", "chinese", "roman", "egyptian"]
const startingMedia = ["paintings", "ceramics", "stone", "sculptures", "prints", "glass", "textiles", "photographs", "drawings"]

/**
 * The Page thats shown when the user first lands onto the website
 */
export default class ExplorePage extends React.Component<IProps, IState> {

    constructor(props: any) {
        super(props);
        this.state = {
            queryArtwork: loadingArtwork,
            chosenArtwork: loadingArtwork,
            imageDataURI: null,
            cultureItems: Array(nMatches).fill(loadingMatch),
            mediumItems: Array(nMatches).fill(loadingMatch),
            cultureFilter: startingCultures[Math.floor(Math.random() * Math.floor(startingCultures.length))],
            mediumFilter: startingMedia[Math.floor(Math.random() * Math.floor(startingMedia.length))],
            shareLink: null
        }

        // Bind everything for children
        this.setResultArtwork = this.setResultArtwork.bind(this);
        this.scrollToReference = this.scrollToReference.bind(this);
        this.changeCulture = this.changeCulture.bind(this);
        this.changeMedium = this.changeMedium.bind(this);

    }

    // Reference for scrolling to the start of the compare block
    startRef = React.createRef<HTMLDivElement>();

    /**
     * Executes a smooth scroll effect to a specified reference
     * @param reference the reference object to scroll to
     */
    scrollToReference(reference: any): void {
        window.scrollTo({ top: reference.current.offsetTop, left: 0, behavior: "smooth" });
    }

    changeCulture(option: string): void {
        this.setState({ cultureFilter: option }, () => this.executeQuery(this.state.queryArtwork.id!, true));
    }

    changeMedium(option: string): void {
        this.setState({ mediumFilter: option }, () => this.executeQuery(this.state.queryArtwork.id!, false));
    }

    /**
     * Updates the result artwork; enables the rationale button if either artwork have rationale overlays
     * @param newResultArtwork the artwork to set as the new result
     * @param originalArtwork the original artwork
     */
    setResultArtwork(newResultArtwork: ArtMatch): void {
        let self = this;
        this.updateBestMatch(self, newResultArtwork)
    }

    updateBestMatch(component: any, match: ArtMatch) {
        lookup(match.id!)
            .then(function (responseJson) {
                component.setState({
                    chosenArtwork: new ArtObject(
                        responseJson.Artist,
                        responseJson.Classification,
                        responseJson.Culture,
                        responseJson.Image_Url,
                        responseJson.Museum,
                        responseJson.Museum_Page,
                        responseJson.Thumbnail_Url,
                        responseJson.Title,
                        responseJson.id),
                }, component.updateImageDataURI)
            })
    }

    /**
     * Queries API with the original artwork with conditional qualities
     */
    executeQuery(artworkID: string, promoteCultureMatch: boolean) {
        let self = this;
        lookupWithMatches(artworkID, self.state.cultureFilter, self.state.mediumFilter)
            .then(function (responseJson) {
                const cultureInfo = responseJson.matches.culture[self.state.cultureFilter]
                const mediumInfo = responseJson.matches.medium[self.state.mediumFilter]

                function infoToMatches(info: any): ArtMatch[] {
                    return info.ids.map(function (id: string, i: any) {
                        return new ArtMatch(info.urls[i], btoa(id), null);
                    })
                }
                const cultureMatches = infoToMatches(cultureInfo).filter(match => match.id != artworkID)
                const mediumMatches = infoToMatches(mediumInfo).filter(match => match.id != artworkID)
                self.setState({
                    queryArtwork: new ArtObject(
                        responseJson.Artist,
                        responseJson.Classification,
                        responseJson.Culture,
                        responseJson.Image_Url,
                        responseJson.Museum,
                        responseJson.Museum_Page,
                        responseJson.Thumbnail_Url,
                        responseJson.Title,
                        responseJson.id),
                    cultureItems: cultureMatches,
                    mediumItems: mediumMatches
                });
                if (promoteCultureMatch) {
                    return cultureMatches[0]
                } else {
                    return mediumMatches[0]
                }
            })
            .then(function (match) { self.updateBestMatch(self, match) })
    }

    /**
     * Intialization code for the explore webpage
     */
    componentDidMount() {
        let artworkID: string | null = null;

        //Get State from URL
        if (this.props.match.params.data) {
            const url = decodeURIComponent(this.props.match.params.data);
            if (url != null) {
                artworkID = url.split("&")[0].slice(4);
            }
        }

        //If the url has no parameters, randomly pick one from the default list.
        //Every art in the default list has Rationale available.
        if (artworkID == null) {
            let numDefaults = defaultArtworks.length;
            let randIndex = Math.floor(Math.random() * Math.floor(numDefaults));
            artworkID = defaultArtworks[randIndex].id;
        }

        if (artworkID in idToArtwork){
            this.setState({
                cultureFilter: idToArtwork[artworkID].defaultCulture || this.state.cultureFilter,
                mediumFilter: idToArtwork[artworkID].defaultMedium || this.state.mediumFilter
            }, () => this.executeQuery(artworkID!, false));
        }else {
            this.executeQuery(artworkID!, false);
        };

    }

    render() {
        return (
            <Stack className="main" role="main">
                <NavBar />
                <div className="page-wrap" style={{ position: "relative", top: "-20px", width: "100%", overflow: "hidden" }}>
                    <HideAt breakpoint="mediumAndBelow">
                        <div className="explore__background-banner">
                            <img className="explore__parallax" alt={"Banner comparing two artworks"} src={bannerImage} />
                            <div className="explore__banner-text">Explore the hidden connections between art of different cultures and media.</div>
                            <button onClick={() => this.scrollToReference(this.startRef)} className="explore__get-started button" >GET STARTED</button>
                        </div>
                        <div ref={this.startRef} className="explore__compare-block explore__solid">
                            <Stack horizontal horizontalAlign="center" style={{ width: "60%" }}>
                                <SubmitControl />
                            </Stack>
                            <Stack horizontal>
                                <Stack.Item className={halfStack} grow={1}>
                                    <QueryArtwork artwork={this.state.queryArtwork} />
                                </Stack.Item>
                                <Stack.Item className={halfStack} grow={1}>
                                    <ResultArtwork artwork={this.state.chosenArtwork} />
                                </Stack.Item>
                            </Stack>
                        </div>
                    </HideAt>
                    <ShowAt breakpoint="mediumAndBelow">
                        <div className="explore__compare-block explore__solid">
                            <SubmitControl />
                            <Stack horizontal horizontalAlign="center" wrap>
                                <Stack.Item grow={1}>
                                    <QueryArtwork artwork={this.state.queryArtwork} />
                                </Stack.Item>
                                <Stack.Item grow={1}>
                                    <ResultArtwork artwork={this.state.chosenArtwork} />
                                </Stack.Item>
                            </Stack>
                        </div>
                    </ShowAt>
                    <div className="explore__solid">
                        <Stack horizontalAlign="center">
                            <Stack horizontal horizontalAlign="center">
                                <a
                                    href={urlEncodeArt(this.state.chosenArtwork.id!)}
                                    onClick={() => logEvent("Matches", { "Location": "ResultImage" })} >
                                    <button className="explore__buttons button">Use Match as Query</button>
                                </a>
                            </Stack>
                        </Stack>

                        <Separator />
                        <Stack horizontal horizontalAlign="start" verticalAlign="center" wrap>
                            <Options
                                value={this.state.cultureFilter}
                                choices={cultures}
                                changeConditional={this.changeCulture} />
                            <ListCarousel
                                items={this.state.cultureItems!}
                                selectorCallback={this.setResultArtwork}
                                selectedArtwork={this.state.chosenArtwork!} />
                        </Stack>
                        <Separator />
                        <Stack horizontal horizontalAlign="start" verticalAlign="center" wrap>
                            <Options
                                value={this.state.mediumFilter}
                                choices={media}
                                changeConditional={this.changeMedium} />
                            <ListCarousel
                                items={this.state.mediumItems!}
                                selectorCallback={this.setResultArtwork}
                                selectedArtwork={this.state.chosenArtwork!} />
                        </Stack>
                        <Separator />
                        <Stack horizontal horizontalAlign="start" verticalAlign="center" wrap>
                            <Text style={{ "textAlign": "center", "fontWeight": "bold", "paddingLeft": "40px" }} variant="large">Choose Another Query:</Text>
                            <ListCarousel
                                items={defaultArtworks}
                                selectorCallback={(am) => {window.location.href = urlEncodeArt(am.id!)}}
                                selectedArtwork={this.state.chosenArtwork!} />
                        </Stack>

                    </div>
                </div>
            </Stack>
        )
    }
}
