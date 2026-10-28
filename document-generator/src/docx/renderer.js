import {
    pageBreak,
    replaceText,
    replaceNamedImage,
    namedImageExtent
} from "./xml.js";

function put(
    xml,
    placeholder,
    value
) {
    return replaceText(
        xml,
        placeholder,
        value
    );
}

function putImage(
    xml,
    manager,
    placeholder,
    buffer
) {
    const extent = namedImageExtent(
        xml,
        placeholder
    );

    if (!extent) {
        return xml;
    }

    return replaceNamedImage(
        xml,
        placeholder,
        manager.addCover(
            buffer,
            extent,
            placeholder
        )
    );
}

export function renderPage({
    source,
    values,
    images,
    agent,
    manager
}) {
    let xml = source;

    xml = put(
        xml,
        "{{Ref. (ID)}}",
        values.referenceId
    );

    xml = put(
        xml,
        "{{A/C Bedroom}}",
        values.acBedroom
    );

    xml = put(
        xml,
        "{{Bedrooms en suite}}",
        values.bedroomsEnSuite
    );

    xml = put(
        xml,
        "{{Private Pool}}",
        values.privatePool
    );

    xml = put(
        xml,
        "{{Gated complex}}",
        values.gatedComplex
    );

    xml = put(
        xml,
        "{{Parking spaces}}",
        values.parkingSpaces
    );

    xml = put(
        xml,
        "{{Listing name for website}}",
        values.listingNameForWebsite
    );

    xml = put(
        xml,
        "{{Почта сотрудника}}",
        agent.email
    );

    xml = put(
        xml,
        "{{PROPERTY OVERVIEW}}",
        ""
    );

    xml = put(
        xml,
        "{{PROPERTY_TYPE}}",
        values.propertyType
    );

    xml = put(
        xml,
        "{{BEDROOMS}}",
        values.bedrooms
    );

    xml = put(
        xml,
        "{{SERVICE_TYPE}}",
        values.serviceType
    );

    xml = put(
        xml,
        "{{FLOOR}}",
        values.floor
    );

    xml = put(
        xml,
        "{{PRICE_PRINTABLE}}",
        values.pricePrintable
    );

    xml = put(
        xml,
        "{{CATEGORY}}",
        values.category
    );

    xml = put(
        xml,
        "{{REGION}}",
        values.region
    );

    xml = put(
        xml,
        "{{SETTLEMENT}}",
        values.settlement
    );

    xml = put(
        xml,
        "{{COMPLEX}}",
        values.complex
    );

    xml = put(
        xml,
        "{{UNIT_AREA}}",
        values.unitArea
    );

    xml = put(
        xml,
        "{{LAND_AREA}}",
        values.landArea
    );

    xml = put(
        xml,
        "{{BATHROOMS}}",
        values.bathrooms
    );

    xml = put(
        xml,
        "{{OFFICE}}",
        values.office
    );

    xml = put(
        xml,
        "{{LAUNDRY}}",
        values.laundry
    );

    xml = put(
        xml,
        "{{SECOND_KITCHEN}}",
        values.secondKitchen
    );

    xml = put(
        xml,
        "{{WIFI}}",
        values.wifi
    );

    xml = put(
        xml,
        "{{DISHWASHER}}",
        values.dishwasher
    );

    xml = put(
        xml,
        "{{AC_LIVING_ROOM}}",
        values.acLivingRoom
    );

    xml = put(
        xml,
        "{{COMMON_POOL}}",
        values.commonPool
    );

    xml = put(
        xml,
        "{{GYM}}",
        values.gym
    );

    xml = put(
        xml,
        "{{SECURITY}}",
        values.security
    );

    xml = put(
        xml,
        "{{AGENT_NAME}}",
        agent.name
    );

    xml = put(
        xml,
        "{{AGENT_PHONE}}",
        agent.phone
    );

    xml = putImage(
        xml,
        manager,
        "{{MAIN_PICTURE}}",
        images.main
    );

    xml = putImage(
        xml,
        manager,
        "{{PIC_1}}",
        images.pic1
    );

    xml = putImage(
        xml,
        manager,
        "{{PIC_2}}",
        images.pic2
    );

    xml = putImage(
        xml,
        manager,
        "{{PIC_3}}",
        images.pic3
    );

    xml = putImage(
        xml,
        manager,
        "{{AGENT_PIC}}",
        agent.photo
    );

    return xml;
}

export function combinePages(pages) {
    return pages
        .map((page, index) => {
            if (index === pages.length - 1) {
                return page;
            }

            return `${page}${pageBreak()}`;
        })
        .join("");
}
